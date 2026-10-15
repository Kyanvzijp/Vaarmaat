# Changelog

## 2.6 (15 oktober 2026)
Navigatie uit `docs/VERBETERPLAN.md` (NAV-01, NAV-02, NAV-03), in de webapp en de app.
- Rustige instructies: vaste bruggen met ruim voldoende hoogte en "Vaar door op ..." zijn stille stappen (grijs in de stappenlijst, geen melding onderweg). Krappe bruggen krijgen "Let op: Schrijversbrug 1,60 m, je hebt 0,20 m ruimte". Bruggen met onbekende hoogte vlak achter elkaar krijgen één melding ("de komende 9 bruggen"). Een gewone vaste brug binnen 200 m van een sluis, beweegbare brug of afslag wordt stil. Twee instructies binnen 200 m worden samen genoemd ("..., daarna sla linksaf"). Delft naar Loosdrecht: van 63 naar 24 instructies, bewaakt in `npm run test:routes`.
- Automatisch herberekenen: na 20 seconden meer dan 80 m van de route, of meteen als je op een andere vaarweg vaart; hoogstens eens per 30 seconden. Leidt de nieuwe route je alleen terug naar de oude, dan blijft de oude staan. Gepasseerde tussenpunten worden overgeslagen (ook bij de knop Herbereken). Melding en spraak: "Nieuwe route berekend, 4 min langer".
- Scherm aan tijdens navigatie met de Screen Wake Lock (opnieuw na terugkomen in de app, los bij Stop); lukt dat niet, dan één keer een tip over de schermvergrendeling. In de app bleef het scherm al aan.
- Trillen bij een nieuwe instructie en bij de naderingskaart (web: Vibration API, app: `expo-haptics`), uit te zetten in Instellingen.
- Fout opgelost: na een GPS-sprong (of nadat je positie ver naast de route op het eindpunt viel) vond de navigatie je positie op de route niet meer terug en meldde hij honderden meters afwijking. Snelheden boven 80 km/u tellen niet mee voor de aankomsttijd.
- Gedeeld in `src/navigation.ts` (`nextCue`, `nextAnnounced`) en `src/reroute.ts`, met unit-tests.

## 2.5 (14 oktober 2026)
Eerste gebruik en veiligheid uit `docs/VERBETERPLAN.md` (ONB-01, ONB-02, VEI-01), in de webapp en de app.
- Onboarding bij de eerste start: welkom, boottype (met de vraag of het een huurboot is), hoogte boven water met tekening, diepgang en kruissnelheid. "Ik weet het niet precies" neemt de standaardmaten van het type en markeert de hoogte als geschat. Opnieuw doorlopen via Aan boord, Instellingen.
- Disclaimer "Goed om te weten" met drie punten, één keer bevestigen; de versie wordt bewaard en bij een nieuwe versie vraagt de app alleen die stap opnieuw. Ook bij overslaan.
- Overgeslagen of geschat: de routesheet vraagt "Je route is berekend voor een sloep van 1,40 m hoog. Klopt dat?" of herinnert aan de geschatte hoogte, met Boot instellen.
- Huurboot: na de onboarding een scherm "Eerste keer varen?" met de vertrekchecklist en de lessen Voorrang en Veiligheid.
- Noodscherm, altijd gratis en zonder internet: Bel 112, positie in graden en decimale minuten en in decimale graden, de vaarweg en het dichtstbijzijnde herkenningspunt ("80 m ten westen van Sumatrabrug"), positie delen of per sms, Kustwacht 0900 0111, KNRM en een ingevulde Mayday-tekst voor de marifoon. Te openen vanuit Aan boord en met de knop Nood tijdens navigatie.
- Focusring voor toetsenbordgebruik, unit-tests voor positie, omschrijving, Mayday en onboarding.

## 2.4 (14 oktober 2026)
Bugfixes uit `docs/VERBETERPLAN.md` (FIX-00 tot en met FIX-17), in de webapp en de app.
- Navigatie: een mislukte herberekening laat de oude route staan in plaats van de navigatie te laten vastlopen; de Stop-knop is er altijd. Vanuit Leren, Tochten of Aan boord kom je tijdens navigatie terug met "Terug naar navigatie".
- Aankomst is zichtbaar in de instructiebalk en als melding, en alleen als je echt op de route bent (ver ernaast viel je positie op het eindpunt).
- Resterende tijd en aankomsttijd springen niet meer omhoog als je stilligt voor een sluis of brug.
- Meldingen voor sluizen, bruggen en afslagen hebben een sleutel per plek, zodat ze na herberekenen niet opnieuw komen.
- Tussenpunten zijn een eigen stap ("Tussenpunt 1: Leiden centrum") in plaats van "Tussenstop 1: via via".
- GPS stopt na de navigatie, als je de kaart niet meer laat volgen en als de app naar de achtergrond gaat; "Mijn locatie" als vertrekpunt vraagt één positie.
- Logboek: de tocht die je vaart wordt elke 15 seconden bewaard en na een crash of afsluiten alsnog in het logboek gezet; GPX met tijd per punt en geldige tekens; GPS-sprongen tellen niet als topsnelheid. Nieuwe kolom `logs.track_times` (migratie `20261014120000_log_track_times.sql`).
- Meldingen onderin met soort (succes, info, fout) die vanzelf verdwijnen; wissen van een tocht of logboekitem kan ongedaan worden gemaakt; naam van een tocht via een eigen dialoog in plaats van `window.prompt`.
- Routesheet: Start navigatie staat vast onderaan en is ook op kleine telefoons zonder scrollen zichtbaar; alternatieven op één regel; subtabs lopen niet meer buiten beeld.
- Dagindeling volgt de route en gaat ook weer uit, tenzij je hem zelf omzet.
- Weer: geen technische foutmelding meer, wel een knop Opnieuw; haalt het weer niet elke seconde opnieuw op als GPS aan staat.
- Zoeken: bekende bestemmingen direct, adressen pas als je stopt met typen en nooit vaker dan eens per seconde (gebruiksbeleid Nominatim); zoekvelden heten voor schermlezers "Vertrekpunt", "Bestemming" en "Tussenpunt 1".
- Code: gedeelde `src/logbook.ts`, `src/notice.ts`, `src/stepIcons.ts`; unit-tests met `npm run test:units` (ook in CI); lint zonder waarschuwingen; ongebruikte assets verwijderd.

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
