# Vaarmaat backend: contracten voor Lovable Cloud (Supabase)

Dit document vertaalt hoofdstuk 6, 7 en de feeds uit `docs/SPEC.md` naar concrete afspraken voor de backend. De spec noemt Netlify Functions; met Lovable Cloud worden dat Supabase Edge Functions (Deno). De contracten blijven gelijk, alleen de plek verandert. Netlify kan de statische site blijven hosten.

## 1. Omgevingsvariabelen en secrets

Frontend (`.env`, mag publiek zijn):

| Variabele | Doel |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project-URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publieke (anon) sleutel |
| `VITE_SUPABASE_PROJECT_ID` | project-id, door Lovable gezet |
| `VITE_ANALYTICS_SCRIPT` | script-URL van Plausible of Umami, leeg is uit |
| `VITE_ANALYTICS_DOMAIN` | domein (Plausible) of website-id (Umami) |

Edge Function secrets (nooit in de frontend): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MAAND`, `STRIPE_PRICE_SEIZOEN`, `STRIPE_PRICE_JAAR`, `RESEND_API_KEY`, `TWILIO_*` (optioneel), `BOOKING_AFFILIATE_ID`, `SUPABASE_SERVICE_ROLE_KEY` (automatisch aanwezig).

## 2. Datamodel

Schema in `supabase/migrations/20260904120000_init.sql`. Samenvatting:

| Tabel | Sleutel | Wie schrijft | RLS |
| --- | --- | --- | --- |
| `profiles` | `id` = `auth.users.id` | gebruiker | eigen rij |
| `trips` | `id` (tekst, uit de app) | gebruiker | eigen rijen |
| `logs` | `id` (tekst, uit de app) | gebruiker | eigen rijen |
| `lesson_progress` | `(user_id, lesson_id)` | gebruiker | eigen rijen |
| `favourites` | `(user_id, poi_id)` | gebruiker | eigen rijen |
| `subscriptions` | `user_id` | alleen Stripe-webhook (service role) | gebruiker leest eigen rij |
| `marinas` | `id` | beheer (fase 4: rol `marina_admin`) | iedereen leest havens met `accepts_requests` |
| `booking_requests` | `id` | gebruiker maakt aan, functie werkt status bij | eigen rijen lezen |
| `bookings` | `id` | functie | eigen rijen lezen |
| `reports` | `id` | iedereen mag invoegen (ook gast) | eigen meldingen lezen |

De id's van `trips` en `logs` zijn tekst, omdat de app ze al lokaal maakt (`uid()` in `src/store.ts`). Zo heeft een lokale en een externe rij dezelfde sleutel en is samenvoegen eenvoudig.

`public.has_plus(uid)` is de enige plek waar "heeft Plus" wordt bepaald in de database. Gebruik die functie in RLS voor Plus-inhoud en in Edge Functions.

Profielen worden automatisch aangemaakt door de trigger `on_auth_user_created`.

## 3. Synchronisatie (SPEC 6.1)

Gedrag in `src/backend/sync.ts`:

1. Na inloggen: `uploadLocal(userId)`. Lokale tochten, logboek, favorieten en lesvoortgang worden geüpload met `ignoreDuplicates`, zodat rijen die al op de server staan niet overschreven worden. Bootprofiel en instellingen alleen als het profiel op de server nog leeg is.
2. Daarna en bij elke start: `pullRemote(userId)`. Server en lokaal worden per id samengevoegd, de server wint per record. Het resultaat wordt lokaal bewaard en teruggegeven zodat `App.tsx` de state kan zetten.
3. Bij elke wijziging: `pushTrip`, `deleteTrip`, `pushLog`, `deleteLog`, `setFavourite`, `pushLessonProgress`, `pushProfile`.

Nog te bouwen: een wachtrij in IndexedDB voor wijzigingen die offline gebeuren. Elke `push*`-aanroep die mislukt door netwerkfouten wordt in de wachtrij gezet (`{ op, table, payload, at }`) en bij `online` opnieuw geprobeerd in volgorde. Conflict: nieuwste `updated_at` wint.

## 4. Abonnement en Plus (SPEC 6.2, 6.3)

Prijzen: 4,99 per maand, 14,99 per seizoen (92 dagen), 24,99 per jaar, inclusief 21 procent btw. Proefperiode 14 dagen zonder kaart via `subscriptions.trial_until`.

Edge Function `stripe-webhook` (POST, verifieert de handtekening met `STRIPE_WEBHOOK_SECRET`, schrijft met service role):

| Stripe-event | Actie |
| --- | --- |
| `checkout.session.completed` | `subscriptions` upsert: `status = 'active'`, `plan`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end` |
| `customer.subscription.updated` | `status` en `current_period_end` bijwerken (`past_due` bij betalingsproblemen) |
| `customer.subscription.deleted` | `status = 'canceled'` |
| `invoice.payment_failed` | `status = 'past_due'`, e-mail naar de gebruiker |

De koppeling gebruiker naar Stripe-klant loopt via `client_reference_id = user_id` in Checkout en `metadata.user_id` op de klant.

Edge Function `create-checkout` (POST, ingelogd): maakt een Checkout-sessie voor het gekozen plan en geeft de URL terug. Verplichte tekst op de pagina ervoor: "Prijzen inclusief 21 procent btw" en de checkbox "Ik wil direct toegang en zie af van mijn herroepingsrecht". Edge Function `customer-portal` geeft een Customer Portal-link.

Frontend: `fetchSubscription(userId)` in `src/backend/subscription.ts` bij opstarten en na inloggen; `hasPlus()` leest de cache. De cache is nu localStorage met 7 dagen respijt na `until`. De spec vraagt om versleutelde opslag in IndexedDB (Web Crypto, sleutel per apparaat); bouw dat als vervanging van `cache()` en `loadCachedSubscription()` zonder de publieke functies te veranderen.

Gated (met `PlusGate`): volledige lesmodules na "In het kort", quizzen, oefenexamen, certificaat, dagindeling met overnachtingen, Onderweg-overnachten en tankplanning, sync, GPX-export, real-time brugstatus. Nooit gated: routeplanner, navigatie, spraak, naderingskaart met korte checklist, bruglichten en noodinformatie, weer, checklists, favorieten.

Edge Function `plus-content` (GET, ingelogd): controleert `has_plus(auth.uid())` en geeft `public/plus/lessons-plus.json` terug met `Cache-Control: private, max-age=86400`. De app bewaart de inhoud lokaal zodat hij offline werkt.

Edge Function `plus-certificate` (POST, ingelogd): PDF "Vaarmaat sluis- en brugpassage" met pdf-lib na 80 procent op de quizzen sluis, brug en marifoon.

## 5. Feeds (SPEC 4.1, 4.3, 4.4)

Elke feed gaat via een Edge Function met caching, zodat de app nooit direct van een derde partij afhankelijk is. Bij een storing geeft de functie de laatste goede versie terug met `stale: true`, maar nooit ouder dan de genoemde maximale leeftijd.

| Functie | Bron | Cache | Antwoord |
| --- | --- | --- | --- |
| `feeds-ops` | Vaarweginformatie.nl bedieningstijden (`data/ops_rws.json`) en BAS-berichten | 15 min | `{ objects: { [isrsOfNaam]: { hours, vhf, tel, notes } }, notices: [{ id, title, text, from, to, geometry?, objectRefs[] }] }` |
| `feeds-waterlevels` | RWS Waterinfo, meetpunten uit `data/waterlevel_stations.json` | 10 min | `{ stations: { [id]: { level_nap: number, at: string } } }` |
| `feeds-bridges` | NDW Blauwe Golf Verbindend (DATEX II) | 60 s, max 10 min oud | `{ bridges: [{ id, name, lat, lon, status: 'open'\|'closed'\|'opening'\|'closing'\|'unknown', since, planned[] }] }` |

Koppeling aan `graph.json` gebeurt build-time in `scripts/match_ops.py` en landt in `public/data/overrides.json`, nooit in `graph.json`.

## 6. Reserveren (SPEC 7)

Fase 2: deeplinks. `stays.json` en `pois.json` krijgen `book: { provider, url }`. Knop "Reserveren" opent de link, event `booking_click`.

Fase 3: aanvragen. Edge Function `booking-request` (POST, ingelogd): maakt een rij in `booking_requests`, weigert een dubbele aanvraag voor dezelfde haven en datum, stuurt e-mail via Resend (en optioneel WhatsApp via Twilio) naar de haven met twee ondertekende links (bevestigen, afwijzen, 48 uur geldig). Edge Function `booking-respond` (GET met token): zet de status en stuurt bericht naar de schipper. Geplande job (pg_cron of een dagelijkse functie): aanvragen ouder dan 48 uur zonder reactie worden `expired`.

## 7. Delen (SPEC 8.1)

Tabel `shared_trips (id text primary key, name, waypoints jsonb, created_at)` met RLS: iedereen mag lezen, alleen ingelogde gebruikers mogen aanmaken. Route `/t/<id>` in de app laadt de tocht en opent hem in de planner. Nieuwe migratie toevoegen als dit gebouwd wordt.

## 8. Tests die groen moeten zijn

- Webhook: de vier Stripe-events met testpayloads leiden tot de juiste `subscriptions`-rij.
- RLS: gebruiker A kan de tochten, het logboek en het abonnement van gebruiker B niet lezen of schrijven.
- Gating: gast ziet bij een Plus-module de eerste sectie en een gate; met proefperiode en met betaald abonnement laadt de volledige inhoud, ook offline na de eerste keer.
- Gastmodus: zonder `VITE_SUPABASE_*` werkt de hele app, geen console-errors.
- Bestaand: `npm run build`, `npm run lint`, `npm run test:routes`, `npm run screenshot` zonder fouten.
