# Vaarmaat

Routeplanner en navigatie voor de pleziervaart, zoals Google Maps maar dan voor het water. Eerste versie dekt het Groene Hart en de Hollandse Plassen (Kaag, Leiden, Alphen, Braassem, Westeinder, Nieuwkoop, Gouda, Delft, Den Haag, Haarlem, Amsterdam, Vecht, Loosdrecht, Utrecht).

Wat de app doet:

- Alles-in-een voor aan boord: routeplanning, meerdaagse tochten, havens en aanlegplaatsen, live navigatie met spraak, e-learning over sluizen, bruggen en vaarregels, weer en wind, checklists en een logboek. Werkt offline na de eerste keer laden (PWA).

- Vertrekpunt en bestemming zoeken (bekende vaarbestemmingen, adressen via OpenStreetMap, je GPS positie of een tik op de kaart).
- Snelste route plus twee alternatieven, met afstand in km, vaartijd, aankomsttijd en de vaarwegen die je volgt.
- Afslag voor afslag: "Sla linksaf naar de Oude Rijn", "Vaar onder Zijlbrug door (4,90 m)", "Wacht op opening Lisserbrug", "Schut door sluis".
- Bootprofiel: type, hoogte boven water, diepgang, breedte, kruissnelheid, marge onder bruggen, wel of niet wachten op beweegbare bruggen. Bruggen die te laag zijn worden vermeden; als er geen route past legt de app uit welke brug blokkeert.
- Live navigatie met GPS: volgende instructie, afstand tot de afslag, snelheid in km/u, resterende tijd, aankomsttijd, koers, en herberekenen als je van de route afwijkt.
- Tussenpunten en meerdaagse tochten: vaaruren per dag instellen, de app knipt de route in dagetappes en stelt jachthavens of aanlegplaatsen voor om te overnachten. Tochten bewaren onder Mijn tochten.
- Havens, aanlegplaatsen, tankstations, vuilwaterstations, trailerhellingen en verboden (afmeer- of ankerverbod) op de kaart, met liggeld, telefoon, website en voorzieningen waar bekend. Tabblad Aanleggen toont wat er bij je bestemming is.
- Nadering van een sluis of beweegbare brug: X minuten van tevoren (instelbaar) verschijnt een kaart met marifoonkanaal, telefoonnummer en bedieningstijden (indien bekend), een voorbereidingschecklist en de bijbehorende uitleg.
- Leren: modules over sluizen, bruggen (alle bruglichten), marifoon, voorrangsregels, aanmeren en waar het niet mag, vaarregels en verplichtingen, borden en betonning, veiligheid en noodgevallen, weer. Met quizvragen en voortgang.
- Weer en wind via Open-Meteo met een vaaradvies (windkracht, vlagen, onweer, regen), zonsopkomst en zonsondergang.
- Checklists (vertrek, sluis en brug, aankomst, seizoen) en een automatisch logboek van gevaren tochten met GPX export.
- Kaartlagen: OpenStreetMap, satelliet en OpenSeaMap symbolen. Werkt als web app op telefoon (toevoegen aan beginscherm).

## Lokaal draaien

```bash
npm install
npm run dev          # http://localhost:8080
```

Node 22 (zie `.nvmrc`). Zonder `.env` draait de app volledig als gast met opslag in de browser. Wil je de backend lokaal testen, kopieer dan `.env.example` naar `.env` en vul de Supabase-waarden in.

Controles die groen moeten blijven:

```bash
npm run build        # TypeScript strict en Vite
npm run lint         # oxlint
npm run test:routes  # bekende routes (Kaag naar Leiden, Alphen naar Amsterdam, ...)
npm run preview & npm run screenshot   # schermafbeeldingen op telefoon en desktop, geen console-errors
```

## Backend, accounts en Vaarmaat Plus

De frontend werkt zonder backend. Accounts, synchronisatie, het Plus-abonnement, feeds en reserveren worden gebouwd op Supabase (Lovable Cloud). Wat er klaarstaat:

- `supabase/migrations/` met het databaseschema en Row Level Security.
- `src/integrations/supabase/` met de client (null zonder configuratie) en de databasetypes.
- `src/backend/` met inloggen via magic link, synchronisatie van tochten, logboek, favorieten, lesvoortgang en profiel, en de Plus-status.
- `src/components/PlusGate.tsx` en `src/analytics.ts`.

Lees `docs/LOVABLE.md` (stappenplan en projectkennis voor Lovable), `docs/BACKEND.md` (contracten van tabellen, functies en feeds) en `docs/APPSTORE.md` (de latere overstap naar de App Store en Google Play).

## Deployen

Lovable publiceert zelf, of gebruik Netlify: koppel de repo, `netlify.toml` staat klaar (Node 22, build `npm run build`, publish `dist`, SPA redirect). Zet dezelfde `VITE_`-variabelen als in `.env.example` in de omgeving van Netlify. Drag and drop kan ook: `npm run build` en sleep `dist` naar https://app.netlify.com/drop.

GPS werkt alleen via https; Netlify regelt dat automatisch.

## Vaarwegdata verversen of uitbreiden

De vaarwegen, bruggen (doorvaarthoogtes) en sluizen komen uit OpenStreetMap en staan voorberekend in `public/data/graph.json`.

```bash
node scripts/fetch_osm.mjs                       # vaarwegen, bruggen, sluizen (Groene Hart + Hollandse Plassen)
node scripts/fetch_osm.mjs 50.75 3.20 53.60 7.25 # heel Nederland (grotere download)
python3 scripts/build_graph.py                   # bouwt public/data/graph.json
node scripts/fetch_pois.mjs                      # havens, aanlegplaatsen, voorzieningen, bedieningsinfo
python3 scripts/build_pois.py                    # bouwt public/data/pois.json en koppelt marifoon/telefoon/tijden aan bruggen en sluizen
npx tsx scripts/test_route.ts                    # controleert een aantal bekende routes
```

Bij een ander gebied ook `KNOWN_PLACES` in `src/geocode.ts` en de `VIEWBOX` daar aanpassen.

## Hoe de routering werkt

`scripts/build_graph.py` maakt van alle OSM vaarwegen (canal, river, fairway) een graaf van knopen en segmenten, koppelt losse eindpunten binnen 30 m, projecteert bruggen (`seamark:bridge:clearance_height`, `bridge:movable`) en sluizen op de segmenten en verwijdert duikers en niet bevaarbare stukken. In de browser rekent `src/routing.ts` met A* de snelste route op basis van tijd: lengte gedeeld door de kruissnelheid of de maximumsnelheid van de vaarweg, plus wachttijd bij beweegbare bruggen en sluizen. Bruggen lager dan hoogte plus marge zijn geblokkeerd tenzij ze beweegbaar zijn en je dat toestaat. Alternatieven ontstaan door de gevonden route zwaarder te wegen en opnieuw te rekenen.

Doorvaarthoogtes in OpenStreetMap zijn niet volledig (van ongeveer 1 op de 5 bruggen is de hoogte bekend) en hangen af van de waterstand. Controleer altijd ter plaatse; de app waarschuwt bij bruggen met onbekende hoogte en je kunt die desgewenst laten vermijden.

## Structuur

```
src/
  App.tsx            hoofdscherm, tabbladen en state
  components/        kaart, zoekvelden, bootprofiel, routepaneel, navigatie, nadering sluis/brug, lessen, tochten, aan boord
  content/lessons.ts e-learning modules, quizvragen en checklists
  routing.ts         A*, kosten per bootprofiel, alternatieven, afslaginstructies
  trip.ts            tussenpunten, dagetappes en overnachtingsvoorstellen
  navigation.ts      positie op de route, resterende afstand en tijd
  voice.ts           gesproken instructies
  weather.ts         Open-Meteo en vaaradvies
  pois.ts            havens en voorzieningen
  store.ts           opslag van tochten, logboek, checklists, instellingen (localStorage)
  analytics.ts       privacyvriendelijke events (Plausible of Umami)
  backend/           auth (magic link), sync met Supabase, Plus-status
  integrations/supabase/  client en databasetypes (pad van Lovable Cloud)
  graph.ts           graaf, ruimtelijke index, snappen van punten op het water
  geocode.ts         bekende bestemmingen en Nominatim zoeken
  profile.ts         boottypes en opslag van het profiel
scripts/
  fetch_osm.mjs      vaarwegen ophalen          build_graph.py  graaf bouwen
  fetch_pois.mjs     havens en bediening ophalen build_pois.py  POI's bouwen en bedieningsinfo koppelen
  test_route.ts      routes controleren in de terminal
  screenshot.mjs     schermafbeeldingen met Playwright      icons.mjs       PNG-iconen uit de SVG
supabase/migrations/    databaseschema met RLS
docs/                   SPEC.md, STYLEGUIDE.md, LOVABLE.md, BACKEND.md, APPSTORE.md
public/data/graph.json  voorberekende vaarwegengraaf
public/data/pois.json   havens, aanlegplaatsen, voorzieningen, verboden
```

Data: © OpenStreetMap bijdragers (ODbL). Kaartsymbolen: OpenSeaMap.
