-- Tijd per punt van het gevaren spoor, voor een GPX-export met tijden (verbeterplan FIX-16).
-- Even lang als logs.track: [ms sinds 1970, ...]. Leeg bij tochten van voor deze wijziging.
-- RLS verandert niet: de bestaande policy "logboek: eigen rijen" geldt voor de hele rij.
alter table public.logs add column if not exists track_times jsonb;
