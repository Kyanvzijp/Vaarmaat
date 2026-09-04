# Vaarmaat in Lovable: overdracht en stappenplan

Dit document beschrijft hoe je deze repository in Lovable opent en wat Lovable daarna moet bouwen. De frontend (routeplanner, navigatie, kaart, lessen, offline) is klaar en werkt zonder backend. Lovable bouwt de backend: accounts, synchronisatie, Vaarmaat Plus, feeds en reserveren. De technische contracten daarvoor staan in `docs/BACKEND.md`.

## 1. Wat er al staat

- React 19, TypeScript strict, Vite 8, Leaflet, vite-plugin-pwa. Geen Tailwind en geen shadcn: alle styling staat in `src/index.css` met de tokens uit `docs/STYLEGUIDE.md`. Voeg geen tweede stijlsysteem toe.
- Vite draait op poort 8080 en kent de alias `@` naar `src/`, zoals Lovable verwacht.
- Supabase-client op het pad dat Lovable Cloud gebruikt: `src/integrations/supabase/client.ts` en `types.ts`. Zonder omgevingsvariabelen is de client `null` en draait alles als gast.
- Databaseschema met Row Level Security: `supabase/migrations/20260904120000_init.sql`.
- Backendlaag zonder UI-koppeling: `src/backend/auth.ts` (magic link), `src/backend/sync.ts` (lokaal naar Supabase en terug), `src/backend/subscription.ts` (`hasPlus()`, cache), `src/components/PlusGate.tsx` (gate volgens de styleguide), `src/analytics.ts` (events uit SPEC 8.3).
- Voorbeeld van de omgevingsvariabelen: `.env.example`.
- CI op GitHub: lint, build en de routetest bij elke push.

## 2. Stappenplan

1. **Repository koppelen.** In Lovable: nieuw project, kies "Import from GitHub" (of koppel GitHub onder Settings en selecteer `kyanvzijp/vaarmaat`). Werk in Lovable altijd op een eigen branch of op `main`; Lovable synchroniseert twee kanten op met GitHub.
2. **Eerste build controleren.** Lovable draait `npm install` en `npm run dev`. De app moet direct werken als gast: route Kaag naar Leiden plannen, tabbladen Tochten, Leren en Aan boord openen.
3. **Lovable Cloud inschakelen.** Dat maakt het Supabase-project aan en vult `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` en `VITE_SUPABASE_PROJECT_ID` in. Lovable overschrijft dan `src/integrations/supabase/client.ts` en `types.ts` met gegenereerde versies; dat is de bedoeling. Let op: de gegenereerde client mag nooit crashen als de variabelen ontbreken, want de gastmodus moet blijven werken. Vraag Lovable expliciet om `supabase` als `null` te exporteren zonder configuratie, of om `hasBackend()` te behouden.
4. **Migratie toepassen.** Vraag Lovable om `supabase/migrations/20260904120000_init.sql` uit te voeren op het nieuwe project. Controleer daarna in de Cloud-weergave dat de tabellen `profiles`, `trips`, `logs`, `lesson_progress`, `favourites`, `subscriptions`, `marinas`, `booking_requests`, `bookings` en `reports` bestaan en dat RLS aan staat.
5. **Projectkennis instellen.** Plak de tekst uit hoofdstuk 3 in de projectkennis van Lovable (Settings, Knowledge), zodat elke prompt binnen de kaders blijft.
6. **Bouwen in de volgorde van hoofdstuk 4.** Eén onderwerp per prompt, na elke stap testen als gast en als ingelogde gebruiker.
7. **Deployen.** Lovable kan zelf publiceren. Wil je op Netlify blijven: `netlify.toml` staat klaar (build `npm run build`, publish `dist`), zet dezelfde `VITE_`-variabelen in Netlify.

## 3. Projectkennis voor Lovable (kopieer en plak)

```
Vaarmaat is een Nederlandse PWA voor de pleziervaart (routeplanner, navigatie, tochten, havens, lessen). Lees eerst docs/SPEC.md, docs/STYLEGUIDE.md en docs/BACKEND.md.

Regels:
- Taal in de UI: Nederlands, je-vorm, korte zinnen, geen streepjes als leesteken, geen Engelse termen als er een Nederlands woord is (tussenpunt, aanlegplaats, bedieningstijden).
- Styling alleen met de CSS-variabelen in src/index.css. Geen Tailwind, geen shadcn, geen extra UI-bibliotheek. Nieuwe kleuren alleen als token.
- Raak src/routing.ts, src/graph.ts, src/trip.ts, src/navigation.ts en public/data/*.json niet aan. De routering draait in de browser en heeft geen backend nodig.
- App.tsx is de enige eigenaar van planner- en navigatiestate; panelen zijn presentational. Opslag loopt via src/store.ts (localStorage) en src/backend/sync.ts (Supabase).
- Gastmodus moet altijd blijven werken, ook zonder Supabase-configuratie. Alles wat op het water nodig is werkt offline.
- Gebruik src/backend/auth.ts, sync.ts en subscription.ts en src/components/PlusGate.tsx; bouw geen tweede versie.
- Databasewijzigingen alleen via een nieuw bestand in supabase/migrations, altijd met RLS (alleen eigen rijen). De tabel subscriptions wordt alleen door de Stripe-webhook (service role) beschreven.
- Nooit een betaalmuur voor veiligheidsinhoud: noodinformatie, bruglichten, korte checklists, naderingskaart, routeplanner, navigatie en spraak zijn gratis.
- Secrets (Stripe, Resend, Twilio, Booking.com) alleen in Edge Function secrets, nooit in VITE_-variabelen.
- TypeScript strict zonder any. npm run build, npm run lint en npm run test:routes moeten groen blijven. Voeg per feature een regel toe aan CHANGELOG.md.
```

## 4. Bouwvolgorde voor Lovable

Fase 2 uit de spec, gesplitst in prompts van één onderwerp.

1. **Inloggen.** Scherm "Account" onder Aan boord: e-mailveld, knop "Stuur inloglink", status, uitloggen. Gebruik `signInWithMagicLink`, `onAuthChange`, `getUser` uit `src/backend/auth.ts`. Na inloggen `uploadLocal(userId)` en daarna `pullRemote(userId)` aanroepen en de state in `App.tsx` bijwerken met het resultaat.
2. **Synchronisatie per wijziging.** In `App.tsx`: bij bewaren of verwijderen van een tocht, bij een nieuw logboekitem, bij favorieten en bij profiel of instellingen de bijbehorende `push*`-functie uit `src/backend/sync.ts` aanroepen als er een gebruiker is. Daarna de wachtrij voor offline wijzigingen in IndexedDB (zie BACKEND.md).
3. **Abonnement.** Edge Function `stripe-webhook` (zie BACKEND.md), Stripe Checkout-knop met de verplichte tekst (21 procent btw, afzien van herroepingsrecht), Customer Portal-link, `fetchSubscription` bij opstarten en na inloggen. Proefperiode van 14 dagen zonder kaart via `trial_until`.
4. **Gating.** `PlusGate` plaatsen bij lesmodules (na "In het kort"), quizzen, dagindeling met overnachtingen, GPX-export en sync. Nooit bij veiligheidsinhoud.
5. **Plus-inhoud.** Edge Function `plus/content` die `public/plus/lessons-plus.json` alleen levert bij een geldig abonnement; app cachet de inhoud lokaal na de eerste keer.
6. **Feeds.** Edge Functions `feeds/ops`, `feeds/waterlevels` en later `feeds/bridges` met caching; contracten in BACKEND.md.
7. **Delen.** Route of tocht delen als link `/t/<id>` (publiek leesbaar, alleen coördinaten en naam).
8. **Reserveren.** Deeplinks (fase 2) en later aanvragen via `booking_requests` met e-mail naar de haven (fase 3).

## 5. Wat niet in Lovable gebeurt

- Data-updates (vaarwegen, bruggen, POI's): de scripts in `scripts/` draaien lokaal of in CI, niet in Lovable.
- Routering en graafwijzigingen: die horen in `src/routing.ts` en de build-scripts en worden buiten Lovable ontwikkeld en met `npm run test:routes` gecontroleerd.
- De overstap naar de app stores: zie `docs/APPSTORE.md`.
