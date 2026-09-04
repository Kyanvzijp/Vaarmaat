# Changelog

## 2.3 (4 september 2026)
- Routering: de zoektocht begint en eindigt op het geprojecteerde punt op de vaarweg in plaats van de dichtstbijzijnde knoop; bruggen en sluizen staan op hun werkelijke positie langs de route in plaats van op het midden van een segment.
- Realistische tijden: 90 procent van de kruissnelheid, 6 km/u in grachten en naamloze sloten, tijd per vaste brug, extra wachttijd bij lage of naamloze beweegbare bruggen, aanmeren voor sluizen. Vaartijd en wachttijd apart in het resultaat en in de samenvatting.
- Routekeuze: naamloze polderslootjes en koppelstukjes zijn onaantrekkelijk, zodat routes echte vaarwegen volgen (Alphen naar Utrecht gaat nu via de Oude Rijn, Leidse Rijn en Vecht in plaats van door de Meije).
- Data: `scripts/refine_graph.py` voegt dubbele bruggen samen (6431 naar 6117 bruggen).
- Stuk over land: als vertrekpunt of bestemming meer dan 150 m van het water ligt, toont de app loopafstand en looptijd, een gestippelde lijn op de kaart en links naar loop-, auto- en ov-routes.
- `npm run test:routes` faalt nu als een bekende route buiten de verwachte afstand valt.

## 2.2 (4 september 2026)
- Repository opgezet voor Lovable: Vite op poort 8080, alias `@`, Node 22, CI op GitHub (lint, build, routetest).
- Backend-scaffold op Supabase: migratie met alle tabellen en RLS (`supabase/migrations`), client en databasetypes op het pad van Lovable Cloud, `src/backend/` met magic link, synchronisatie en Plus-status, `PlusGate`-component, analytics-events.
- PNG app-iconen (192, 512, maskable, apple-touch-icon) via `npm run icons`; manifest en Apple-metatags bijgewerkt.
- Kleurtokens uit de styleguide toegevoegd aan `src/index.css`.
- Documentatie: `docs/LOVABLE.md`, `docs/BACKEND.md`, `docs/APPSTORE.md`; README en CLAUDE.md bijgewerkt.
- Lint-fout opgelost (`useMyLocation` heette als een hook, nu `pickMyLocation`).

## 2.1 (3 september 2026)
- Naam gewijzigd van Vaarwijzer naar Vaarmaat, nieuw beeldmerk.
- Documentatie toegevoegd: `docs/SPEC.md` (alle features en bouwaanpak), `docs/STYLEGUIDE.md` (ontwerp), `CLAUDE.md` (werkinstructies).

## 2.0 (3 september 2026)
- Tabbladen Kaart, Tochten, Leren, Aan boord.
- Tussenpunten, meerdaagse tochten met overnachtingsvoorstellen, tochten bewaren.
- Havens, aanlegplaatsen, voorzieningen en verboden op de kaart; tabblad Aanleggen.
- Bedieningsinfo (marifoon, telefoon, tijden) bij bruggen en sluizen; naderingskaart tijdens navigatie.
- Gesproken instructies, logboek met GPX, checklists, weer en wind, offline (PWA).
- Negen e-learning modules met quiz.

## 1.0 (3 september 2026)
- Routeplanner met bootprofiel, alternatieven, afslagen en GPS-navigatie voor Groene Hart en Hollandse Plassen.
