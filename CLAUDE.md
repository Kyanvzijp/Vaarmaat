# Vaarmaat — werkinstructies voor Claude Code

Vaarmaat is een web app (PWA) voor de pleziervaart in Nederland: routeplanner, navigatie, tochtplanner, havens, e-learning en later reserveren. Lees eerst `docs/SPEC.md` (wat er gebouwd moet worden en hoe) en `docs/STYLEGUIDE.md` (hoe het eruit moet zien). Dit bestand is de korte versie.

## Stack en conventies

- React 19 + TypeScript (strict) + Vite 8, Leaflet via react-leaflet, vite-plugin-pwa. Geen extra UI-bibliotheek; alle styling in `src/index.css` met CSS-variabelen uit de styleguide.
- Taal in de UI: Nederlands, je-vorm, korte zinnen. Afstanden in m en km, snelheid in km/u, hoogtes in m met komma als decimaal (`1,40 m`). Gebruik altijd de helpers in `src/geo.ts` (`formatDistance`, `formatDuration`, `formatSpeed`, `formatHeight`).
- Geen streepjes als leesteken in UI-teksten (geen en-dash of em-dash); gebruik een punt, komma of dubbele punt.
- Data staat voorberekend in `public/data/*.json`; de browser rekent alles zelf (geen routing-API). Scripts in `scripts/` maken de data: `fetch_osm.mjs` → `build_graph.py`, `fetch_pois.mjs` → `build_pois.py`. Wijzig het dataformaat alleen samen met `src/types.ts` en de build scripts.
- Routering leeft in `src/routing.ts` (A*, kostenfunctie `evalEdge`, alternatieven, afslagen). Nieuwe beperkingen of tijdsafhankelijke kosten horen in `evalEdge`, niet in de UI.
- State: `App.tsx` is de enige eigenaar van planner- en navigatiestate; panelen zijn presentational. Opslag via `src/store.ts` (localStorage) en `src/backend/sync.ts` (Supabase, alleen ingelogd).
- Backend: Supabase via Lovable Cloud. Client en types in `src/integrations/supabase/` (Lovable genereert die opnieuw), eigen laag in `src/backend/` (auth, sync, subscription). Schema alleen wijzigen via een nieuw bestand in `supabase/migrations/` met RLS. Zonder `VITE_SUPABASE_*` is de client `null` en moet alles als gast blijven werken. Contracten in `docs/BACKEND.md`, stappenplan in `docs/LOVABLE.md`.
- Importpad `@/` wijst naar `src/`. Vite draait op poort 8080 (conventie van Lovable).
- Build moet altijd slagen: `npm run build` (tsc strict + vite) en `npm run lint`. Draai `npm run test:routes` na wijzigingen aan routing of data; de bekende routes (Kaag → Leiden 12 tot 13 km, Alphen → Amsterdam ongeveer 42 km) moeten blijven werken.
- Deploy: Netlify, `netlify.toml` staat klaar. GPS en spraak werken alleen via https.
- Veiligheidsinhoud (noodnummers, bruglichten, korte checklists) is altijd gratis en offline; zet nooit een betaalmuur voor iets wat iemand op het water direct nodig heeft.

## Werkwijze per taak

1. Zoek de feature op in `docs/SPEC.md`, houd je aan de daar beschreven datamodellen en acceptatiecriteria.
2. Bouw klein en test met Playwright (`scripts/screenshot.mjs` als voorbeeld) op 420×820 (telefoon) en 1280×800.
3. Werk `README.md` bij als er scripts, data of instellingen bijkomen.
4. Commit per feature met een korte Nederlandse boodschap.
