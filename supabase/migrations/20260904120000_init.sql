-- Vaarmaat: eerste databaseschema (SPEC.md hoofdstuk 6 en 7).
-- Uitgangspunten: elke gebruiker ziet alleen eigen rijen (RLS), gastmodus blijft buiten de database,
-- tijdstempels in UTC, JSON voor structuren die de app zelf beheert (bootprofiel, instellingen, tussenpunten, spoor).

create extension if not exists "pgcrypto";

-- Helper: updated_at automatisch bijwerken
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 6.1 Accounts ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  boat jsonb not null default '{}'::jsonb,      -- BoatProfile uit src/types.ts
  settings jsonb not null default '{}'::jsonb,  -- Settings uit src/store.ts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiel: eigen rij lezen" on public.profiles for select using (auth.uid() = id);
create policy "profiel: eigen rij bijwerken" on public.profiles for update using (auth.uid() = id);
create policy "profiel: eigen rij aanmaken" on public.profiles for insert with check (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Profiel automatisch aanmaken bij registratie (magic link)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.trips (
  id text primary key,                          -- id uit de app (store.uid), zodat lokale en externe rij dezelfde sleutel hebben
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  waypoints jsonb not null,                     -- [{ name, point: [lat, lon] }]
  hours_per_day numeric not null default 5,
  start_time text not null default '10:00',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_user_idx on public.trips (user_id, updated_at desc);
alter table public.trips enable row level security;
create policy "tochten: eigen rijen" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trips_updated_at before update on public.trips for each row execute function public.set_updated_at();

create table public.logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null,
  "from" text not null,
  "to" text not null,
  distance numeric not null,                    -- meter
  duration numeric not null,                    -- seconden
  max_speed numeric not null default 0,         -- km/u
  avg_speed numeric not null default 0,         -- km/u
  track jsonb not null default '[]'::jsonb,     -- [[lat, lon], ...]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index logs_user_idx on public.logs (user_id, date desc);
alter table public.logs enable row level security;
create policy "logboek: eigen rijen" on public.logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger logs_updated_at before update on public.logs for each row execute function public.set_updated_at();

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  read_at timestamptz,
  quiz_score numeric check (quiz_score is null or (quiz_score >= 0 and quiz_score <= 1)),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "lesvoortgang: eigen rijen" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger lesson_progress_updated_at before update on public.lesson_progress for each row execute function public.set_updated_at();

create table public.favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  poi_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, poi_id)
);
alter table public.favourites enable row level security;
create policy "favorieten: eigen rijen" on public.favourites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6.2 Abonnement -------------------------------------------------------------

create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'none');
create type public.subscription_plan as enum ('maand', 'seizoen', 'jaar');

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status public.subscription_status not null default 'none',
  plan public.subscription_plan,
  current_period_end timestamptz,
  trial_until timestamptz,                      -- 14 dagen proef zonder kaart
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
-- Alleen lezen voor de gebruiker; schrijven gebeurt uitsluitend door de Stripe-webhook (service role).
create policy "abonnement: eigen rij lezen" on public.subscriptions for select using (auth.uid() = user_id);
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- Eén plek voor de vraag "heeft deze gebruiker Plus?" (ook bruikbaar in RLS van Plus-inhoud)
create or replace function public.has_plus(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and (
        (s.status in ('trialing', 'active', 'past_due') and coalesce(s.current_period_end, now()) >= now())
        or (s.trial_until is not null and s.trial_until >= now())
      )
  );
$$;

-- 7.3 Reserveren (tabellen alvast aanwezig, flow komt in fase 3) ------------

create type public.booking_status as enum ('requested', 'confirmed', 'declined', 'expired', 'cancelled');

create table public.marinas (
  id uuid primary key default gen_random_uuid(),
  poi_id text,                                  -- koppeling met public/data/pois.json
  name text not null,
  contact_email text,
  contact_phone text,
  whatsapp text,
  berths_visitor integer,
  max_length numeric,
  price_per_night numeric,
  price_rules jsonb not null default '{}'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  accepts_requests boolean not null default false,
  auto_confirm boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.marinas enable row level security;
create policy "havens: iedereen leest deelnemende havens" on public.marinas for select using (accepts_requests = true);
create trigger marinas_updated_at before update on public.marinas for each row execute function public.set_updated_at();

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  marina_id uuid not null references public.marinas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  boat jsonb not null,                          -- { name, length, width, draft }
  persons integer,
  note text,
  status public.booking_status not null default 'requested',
  price_estimate numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_to >= date_from)
);
create index booking_requests_user_idx on public.booking_requests (user_id, created_at desc);
create index booking_requests_marina_idx on public.booking_requests (marina_id, date_from);
alter table public.booking_requests enable row level security;
create policy "aanvragen: eigen rijen lezen" on public.booking_requests for select using (auth.uid() = user_id);
create policy "aanvragen: eigen rij aanmaken" on public.booking_requests for insert with check (auth.uid() = user_id);
create trigger booking_requests_updated_at before update on public.booking_requests for each row execute function public.set_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.booking_requests(id) on delete cascade,
  marina_id uuid not null references public.marinas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  berth text,
  amount_paid numeric not null default 0,
  stripe_payment_intent text,
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "boekingen: eigen rijen lezen" on public.bookings for select using (auth.uid() = user_id);

-- 4.9 Datacorrecties ----------------------------------------------------------

create type public.report_kind as enum ('hoogte', 'bediening', 'naam', 'bestaat_niet', 'anders');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,   -- null = gast
  object_type text not null check (object_type in ('bridge', 'lock', 'poi')),
  object_id text not null,
  kind public.report_kind not null,
  value text,
  note text,
  lat double precision,
  lon double precision,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "meldingen: iedereen mag melden" on public.reports for insert with check (true);
create policy "meldingen: eigen meldingen lezen" on public.reports for select using (auth.uid() = user_id);
