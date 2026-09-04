# Vaarmaat — functionele en technische specificatie

Versie 1.0, september 2026. Dit document beschrijft alle features van Vaarmaat: wat al bestaat (v2, opgeleverd), wat er gebouwd moet worden, en hoe. Het is geschreven om direct aan Claude Code te geven. Elke feature heeft een status, een beschrijving, een bouwaanpak, datamodellen waar nodig en acceptatiecriteria.

Status-codes: **KLAAR** (bestaat in v2), **BOUWEN** (nieuw), **UITBREIDEN** (bestaand onderdeel aanpassen).

Prioriteit: fase 1 tot 4, zie hoofdstuk 9. Bouw in die volgorde; elke fase moet los deploybaar zijn.

---

## 1. Productkader

**Doelgroep.** Sloep-, motorboot- en kleine zeilbootvaarders op de Nederlandse binnenwateren, van huurder die voor het eerst vaart tot ervaren eigenaar. Eerste regio: Groene Hart en Hollandse Plassen. Later heel Nederland.

**Belofte.** Zoals Google Maps, maar voor het water, en hij leert je varen terwijl je vaart: route, afslagen, bruggen en sluizen met hoogte en bediening, gesproken navigatie, meerdaagse tochten met overnachting, en uitleg precies op het moment dat je hem nodig hebt.

**Verdienmodel.** Routeplanner en navigatie gratis. Vaarmaat Plus (abonnement, 4,99 per maand, 14,99 per seizoen, 24,99 per jaar) voor de verdiepende e-learning, oefenexamen, meerdaagse planner met overnachtingen, hotels en B&B's, tankplanning, synchronisatie en real-time brugstatus. Transacties (ligplaats, hotel, restaurant reserveren) werken voor iedereen en leveren commissie op. Veiligheidsinhoud is altijd gratis.

**Platform.** PWA op Netlify (statische site plus Netlify Functions voor betalingen, feeds en reserveringen). Geen app store in fase 1 tot 3.

---

## 2. Architectuur

```
Browser (React PWA)
  ├─ Kaart (Leaflet) + tegels (OSM, OpenSeaMap, satelliet), offline gecachet door service worker
  ├─ Routering in Web Worker: graph.json (vaarwegen) + overrides.json (correcties)
  ├─ POI's: pois.json (havens, voorzieningen), stays.json (hotels/B&B), fuel.json (tankstations)
  ├─ Content: lessons.ts (gratis) + plus-content.json (Plus, na inloggen geladen)
  └─ Store: localStorage (gast) → Supabase (ingelogd), met sync
Netlify Functions (Node)
  ├─ /api/stripe-webhook    abonnementsstatus bijwerken in Supabase
  ├─ /api/feeds/ops         RWS bedieningstijden + BAS berichten → JSON, cache 15 min
  ├─ /api/feeds/bridges     NDW/BGV real-time brugstatus → JSON, cache 60 s
  ├─ /api/feeds/waterlevels RWS Waterinfo → JSON, cache 10 min
  └─ /api/booking/*         reserveringsaanvragen naar havens (mail/WhatsApp) + Stripe
Supabase
  ├─ auth (magic link)
  ├─ profiles, subscriptions, trips, logs, lesson_progress, favourites
  ├─ marinas, booking_requests, bookings
  └─ reports (datacorrecties van gebruikers)
Build-time scripts (Node/Python)
  ├─ fetch_osm.mjs + build_graph.py     vaarwegen, bruggen, sluizen
  ├─ fetch_pois.mjs + build_pois.py     havens, voorzieningen, bedieningsinfo
  ├─ fetch_stays.mjs + build_stays.py   hotels, B&B's, restaurants (BOUWEN)
  ├─ build_fuel.py                      tankstations uit OSM + eigen lijst (BOUWEN)
  └─ build_water.py                     waterpolygonen van plassen voor vrije routering (BOUWEN)
```

Principes: alles wat op het water nodig is werkt offline; de browser rekent routes zelf (geen routing-server); externe feeds gaan altijd via een Netlify Function met caching zodat de app nooit direct van een derde partij afhankelijk is; datacorrecties zitten in een aparte laag (`overrides.json`) zodat een OSM-verversing ze niet overschrijft.

---

## 3. Bestaande features (v2, KLAAR)

Deze staan in de code en moeten blijven werken. Regressietest: `npx tsx scripts/test_route.ts` en `node scripts/screenshot.mjs`.

3.1 **Routeplanner.** Vertrekpunt, bestemming en tot 8 tussenpunten (zoeken op bekende bestemmingen, Nominatim, GPS, tik op kaart). A* op tijd met bootprofiel (hoogte, diepgang, breedte, kruissnelheid, marge, beweegbare bruggen toestaan, wachttijden, onbekende bruggen vermijden). Snelste route plus twee alternatieven (kortste afstand, minste bruggen). Uitleg welke brug blokkeert als er geen route is. Bestanden: `src/routing.ts`, `src/graph.ts`, `src/trip.ts`, `src/profile.ts`.

3.2 **Afslagen.** Instructies op kruisingen (links, rechts, houd links aan, rechtdoor naar X), bruggen met doorvaarthoogte, beweegbare bruggen ("wacht op opening"), sluizen, vertrek en aankomst. Logica in `buildSteps` in `src/routing.ts`.

3.3 **Navigatie.** GPS volgen, positie op route, volgende instructie, afstand, resterende tijd, aankomsttijd, snelheid, koers, van-de-route-detectie met herberekenen, gesproken instructies (nl-NL, SpeechSynthesis), naderingskaart voor sluis of beweegbare brug X minuten vooraf met bedieningsinfo en checklist, automatisch logboek met GPX-export. Bestanden: `src/navigation.ts`, `src/voice.ts`, `src/components/NavPanel.tsx`, `ApproachCard.tsx`.

3.4 **Tochtplanner.** Dagindeling op vaaruren per dag met overnachtingsvoorstel (jachthaven of aanlegplaats) per etappe en alternatieven, tochten bewaren en openen. `src/trip.ts`, `src/components/TripsView.tsx`.

3.5 **Havens en voorzieningen.** POI-laag (1.093 objecten in de regio): jachthavens, aanlegplaatsen, tankstations, vuilwaterstations, drinkwater, trailerhellingen, watersportwinkels, werven, ankerplaatsen, afmeer- en ankerverboden, beperkte gebieden. Detailpaneel met liggeld, capaciteit, ligduur, telefoon, website, voorzieningen. Favorieten. Tabblad Aanleggen bij bestemming. `src/pois.ts`, `src/components/PoiPanel.tsx`.

3.6 **Bedieningsinfo.** Marifoonkanaal, telefoon, beheerder, bedieningstijden en opmerkingen uit OSM gekoppeld aan 356 beweegbare bruggen en 97 sluizen. `scripts/build_pois.py`, veld `o` op bruggen en sluizen in `graph.json`.

3.7 **Leren.** Negen modules (sluis, brug, marifoon, voorrang, aanmeren, regels, borden, veiligheid, weer) met "in het kort", secties, seinen met kleurcodes, tips, waarschuwingen, quiz en voortgang. `src/content/lessons.ts`, `src/components/LessonsView.tsx`.

3.8 **Aan boord.** Weer en wind (Open-Meteo, vaaradvies, zon op en onder), vier checklists, logboek, instellingen (spraak, POI's, voorbereidingstijd, vaaruren, vertrektijd), bootprofiel. `src/components/MoreView.tsx`, `WeatherCard.tsx`, `src/weather.ts`.

3.9 **Offline.** Service worker met precache van app en data, runtime cache van kaarttegels (30 dagen), weer (3 uur). `vite.config.ts`.

---

## 4. Data en routering (UITBREIDEN en BOUWEN)

### 4.1 Officiële bedieningstijden en scheepvaartberichten (BOUWEN, fase 2)

Bron: Vaarweginformatie.nl (Rijkswaterstaat) publiceert bedieningstijden van sluizen en bruggen (PDF en data-download) en Berichten aan de Scheepvaart (BAS: stremmingen, storingen, werkzaamheden). Blauwe Golf Verbindend levert via NDW gepland en actueel brugstatus in DATEX II.

Bouw:
1. Netlify Function `feeds/ops`: haalt de bedieningstijden-dataset op (eerst handmatig geconverteerd naar `data/ops_rws.json` via een script, later automatisch), en de BAS-berichten (RSS/JSON van vaarweginformatie.nl) voor de regio; geeft compacte JSON `{ objects: { [isrs_of_naam]: { hours: OpeningHoursSpec, vhf, tel, notes } }, notices: [{ id, title, text, from, to, geometry?, objectRefs[] }] }`. Cache 15 minuten.
2. Koppelscript `scripts/match_ops.py`: matcht RWS-objecten op naam plus positie (binnen 300 m) aan bruggen en sluizen in `graph.json`, schrijft resultaat naar `public/data/overrides.json` (nooit in `graph.json` zelf). Rapporteert niet-gematchte objecten in een lijst voor handmatige controle.
3. App: `src/ops.ts` met een parser voor bedieningstijden naar een `isOpenAt(date)` en `nextOpening(date)` functie. Gebruik het OSM `opening_hours` formaat als interne standaard (bibliotheek `opening_hours` van npm mag), converteer RWS-tijden naar dat formaat in het script.
4. UI: in de routepanel-lijst "Beweegbare bruggen en sluizen" en in de naderingskaart: "Bediend tot 18:00, volgende opening 8:10" en actieve stremmingen in rood met de tekst van het bericht.

Acceptatie: voor minstens 80 procent van de beweegbare bruggen op de route Kaag → Haarlem staan bedieningstijden; een stremming in de BAS-feed op de Ringvaart wordt binnen 15 minuten in de app getoond; `overrides.json` overleeft een herbouw van `graph.json`.

### 4.2 Tijdafhankelijk routeren (BOUWEN, fase 2)

Nu: vaste wachttijd per beweegbare brug en sluis. Doel: wachttijd afhankelijk van de verwachte aankomsttijd op het object.

Bouw:
1. `RouteRequest` krijgt `departAt: Date` (standaard nu, instelbaar in de planner en per dag in de tochtplanner).
2. A* wordt tijdafhankelijk: `dist[]` blijft in seconden vanaf vertrek; in `evalEdge(g, edge, profile, arrivalTime)` wordt voor een brug of sluis met bekende tijden berekend: als open op `arrivalTime` → gemiddelde wachttijd uit het profiel; als dicht → wachttijd tot `nextOpening(arrivalTime)`, met een maximum (bijvoorbeeld 3 uur) waarboven de edge als geblokkeerd geldt voor die dag. Zonder tijden: huidig gedrag.
3. Omdat wachttijden de FIFO-eigenschap respecteren (later aankomen is nooit eerder vertrekken), blijft Dijkstra/A* correct.
4. Weergave: afslag "Wacht op opening X" krijgt "verwacht 8:05, opent 9:00, wachttijd 55 min". Route-samenvatting splitst vaartijd en wachttijd. Alternatieven worden herberekend met dezelfde `departAt`.
5. Tochtplanner: dagetappes gebruiken de vertrektijd per dag; als een sluis na sluitingstijd bereikt wordt, eindigt de etappe vóór de sluis bij de dichtstbijzijnde haven en toont de app de reden.

Acceptatie: Kaag → Haarlem met vertrek 7:30 op een werkdag toont langere wachttijd bij bruggen met spitssluiting dan met vertrek 9:30; unit tests voor `isOpenAt`, `nextOpening` en de kostenfunctie met vaste voorbeelddata.

### 4.3 Real-time brugstatus (BOUWEN, fase 3)

Bron: NDW open data brugopeningen (DATEX II, Blauwe Golf Verbindend). Bouw: Netlify Function `feeds/bridges` parseert de feed (XML → JSON met `{ id, name, lat, lon, status: open|closed|opening|closing|unknown, since, planned[] }`), cache 60 s. Koppel op positie (binnen 100 m) aan bruggen in `graph.json`; cache de koppeling in `overrides.json`. In de app: statusicoon op de kaart bij de brug, in de naderingskaart en in de gesproken instructie ("de brug staat nu open"). Alleen weergave; geen invloed op de routekosten in deze fase.

Acceptatie: status van een gekoppelde brug wijzigt in de UI binnen twee minuten na wijziging in de feed; bij feed-storing toont de app "status onbekend", nooit een oude status ouder dan 10 minuten.

### 4.4 Waterstanden en werkelijke doorvaarthoogte (BOUWEN, fase 2)

Bron: RWS Waterinfo (actuele waterstanden per meetpunt, NAP). OSM-tags `maxheight_referencelevel` en `reference:water_level` op bruggen (253 in de regio). Bouw: Function `feeds/waterlevels` voor de meetpunten in de regio (lijst in `data/waterlevel_stations.json`), cache 10 minuten. In `build_graph.py`: referentiepeil per brug meenemen in `graph.json` (`ref: { level: number, station: string }`). In de app: als voor een brug referentiepeil en actuele stand bekend zijn, is `effectieveHoogte = opgegevenHoogte + (referentiepeil − actueleStand)`. Toon beide ("3,00 m op het bord, nu 2,85 m") en gebruik de effectieve hoogte in `evalEdge` als de gebruiker dat aanzet (instelling, standaard aan als data beschikbaar).

Acceptatie: bij een fictieve waterstand 20 cm boven referentie blokkeert een brug van 1,60 m een boot van 1,45 m met marge 0,10 m.

### 4.5 Vrije routering over plassen (BOUWEN, fase 3)

Probleem: op meren volgt de route de gemapte vaargeullijnen; dat geeft onlogische afslagen en omwegen. Bouw: `scripts/build_water.py` haalt `natural=water` polygonen van plassen groter dan 0,2 km² op (Overpass, `out geom`), vereenvoudigt ze (Douglas-Peucker 5 m), trekt verboden zones en ondieptes (OSM `seamark:restricted_area`, `depth` waar beschikbaar) eruit, en bouwt per plas een visibility graph over de polygoonhoeken plus de in- en uitvaartknopen van de bestaande graaf. Deze extra knopen en edges krijgen `WayInfo.t = 'open_water'` en de naam van de plas, en worden aan `graph.json` toegevoegd. In `buildSteps`: op open_water geen afslagen, alleen "Steek de Kagerplassen over richting X" bij het opvaren en de eerste koers in graden.

Acceptatie: Kaag → Warmond over de Kagerplassen geeft maximaal twee instructies op de plas; totale afstand daalt ten opzichte van de geullijnen; geen route snijdt door land (test met point-in-polygon op 20 steekproefroutes).

### 4.6 Slimmere kostenfunctie en profielen (UITBREIDEN, fase 2)

Toevoegen aan `evalEdge`:
- Vaarwegvoorkeur: `CEMT` en `width` uit OSM meenemen in `WayInfo` (`c`, `wd`). Straffactor voor smalle, naamloze wateringen als de boot breder is dan 2 m of langer dan 7 m (lengte toevoegen aan bootprofiel).
- Bochtstraf: 5 seconden per afslag van meer dan 60 graden, om "in en uit elke zijsloot" te voorkomen; implementeer als node-gebaseerde straf in A* (vergelijk in- en uitgaande richting).
- Profielkeuze "Snel", "Rustig" (vermijd CEMT IV en hoger en drukke kanalen, factor 1,5) en "Toeristisch" (voorkeur voor benoemde vaarwegen en plassen, factor 0,9). Opslaan in `BoatProfile.routing`.
- Beroepsvaart-waarschuwing: als de route meer dan 2 km over CEMT IV+ loopt, waarschuwing in de route-samenvatting met link naar de les Voorrang.

Acceptatie: bestaande testroutes wijzigen niet meer dan 10 procent in afstand met profiel Snel; met profiel Rustig loopt Alphen → Utrecht niet over het Amsterdam-Rijnkanaal.

### 4.7 Tankplanning en actieradius (BOUWEN, fase 1)

Bootprofiel krijgt `tankLiters`, `consumptionLph` (liter per uur op kruissnelheid) en `reserveFraction` (standaard 0,25). Actieradius in uren = tankLiters × (1 − reserve) / consumptionLph. Bij een route langer dan de actieradius: zoek tankstations langs de route (corridor 1 km) en plaats een tankstop vóór het punt waar de reserve bereikt wordt; als er geen is: duidelijke waarschuwing. In de tochtplanner: tankstops als aparte stap in de etappe. Tijdens navigatie: "over 12 km tankstation X, laatste voor 40 km".

Acceptatie: met tank 40 l, 4 l/u en reserve 25 procent (7,5 u) plant Kaag → Loosdrecht (ruim 9 u) minstens één tankstop; bij een route van 2 u geen tankstop.

### 4.8 Dekking en prestaties (BOUWEN, fase 3)

Heel Nederland: `fetch_osm.mjs 50.75 3.20 53.60 7.25`. Graaf opdelen in regiotegels van 1 × 1 graad (`public/data/tiles/{lat}_{lon}.json`), een index `tiles.json` met bbox per tegel; de app laadt tegels die de bounding box van vertrek en bestemming (met 30 km marge) raken, voegt ze samen en cachet ze in IndexedDB. Routering verhuist naar een Web Worker (`src/routing.worker.ts`) met een `postMessage` API; UI toont een spinner na 300 ms. Graafcontractie: alleen kruispunten en objectknopen als graafknopen, tussenliggende geometrie als `shape` per edge, zodat A* over 5 tot 10 keer minder knopen loopt.

Acceptatie: Alphen → Groningen berekent in minder dan 2 seconden op een telefoon uit 2022; tegels van eerdere tochten werken offline.

### 4.9 Datacorrecties door gebruikers (BOUWEN, fase 3)

Knop "Klopt dit niet?" bij elke brug, sluis en POI: formulier met type (hoogte, bediening, naam, bestaat niet, anders), waarde en toelichting, plus positie. Opslag in Supabase-tabel `reports` (of Netlify Forms voor gasten). Beheerscherm (eenvoudige pagina achter admin-login) om meldingen te bekijken en met één klik naar `overrides.json` te schrijven. Wekelijkse job die overrides opnieuw toepast na een OSM-verversing.

---

## 5. Onderweg: hotels, B&B's, tanken, eten (BOUWEN, fase 1)

### 5.1 Data

`scripts/fetch_stays.mjs`: Overpass voor `tourism=hotel|guest_house|bed_and_breakfast|hostel|apartment|camp_site|chalet` en `amenity=restaurant|cafe|pub|supermarket` binnen 1.500 m van een vaarweg (zelfde tegelaanpak als `fetch_pois.mjs`). `scripts/build_stays.py` schrijft `public/data/stays.json` met `{ id, k: 'hotel'|'bnb'|'hostel'|'camping'|'apartment'|'restaurant'|'cafe'|'supermarket', n, p, t: { website, phone, stars, rooms, cuisine, opening_hours, wheelchair } }` en berekent per object de dichtstbijzijnde aanlegplaats of haven uit `pois.json` (`moor: { id, dist }`, loopafstand hemelsbreed × 1,3). Alleen objecten met een aanlegplaats binnen 800 m komen in de dataset.

`scripts/build_fuel.py`: combineert OSM-tankstations (`waterway=fuel`, `seamark:type=bunker_station`, `amenity=fuel` + `boat=yes`) met `data/fuel_manual.json` (handmatig beheerde lijst, gestart vanuit de lijst van Vaarkaart Nederland, met velden `n, p, fuels: ['diesel','benzine','gtl'], opening_hours, payment, phone, website, notes, verified: datum`). Output `public/data/fuel.json`. Handmatige records winnen van OSM bij overlap binnen 150 m.

### 5.2 UI

Nieuw tabblad in het routepaneel: **Onderweg**. Per etappe (of de hele route bij een dagtocht) een lijst gegroepeerd op categorie: Overnachten (hotel, B&B, camping met bij elk de aanlegplaats en loopafstand), Tanken (met brandstofsoorten en of het de laatste kans is binnen X km), Eten (restaurants met eigen steiger of binnen 300 m van een aanlegplaats), Boodschappen. Elk item: naam, afstand langs de route, afstand tot de route, tik → detailpaneel (hergebruik `PoiPanel`) met knoppen Bel, Website, Vaar hierheen en, voor overnachten, "Bekijk beschikbaarheid" (deeplink, zie 7.2).

Kaartlaag: hotels en restaurants alleen tonen vanaf zoom 14 of als ze op de route liggen; iconen volgens de styleguide.

Tochtplanner: per overnachting keuze "aan boord" of "aan wal"; bij "aan wal" stelt de planner de combinatie haven plus hotel voor met de kortste loopafstand, en toont de alternatieven.

Acceptatie: Kaag → Amsterdam toont minstens vijf overnachtingsmogelijkheden aan wal met loopafstand; elke tankstop op de route heeft brandstofsoorten; de lijst laadt in minder dan 200 ms uit de vooraf berekende data.

---

## 6. Accounts, abonnement en Plus-inhoud (BOUWEN, fase 2)

### 6.1 Accounts

Supabase Auth met magic link (e-mail), optioneel Apple en Google login. Tabel `profiles (id, email, display_name, boat jsonb, settings jsonb, created_at)`. Gastmodus blijft volledig werken; bij inloggen worden lokale tochten, logboek, profiel en lesvoortgang eenmalig geüpload (conflict: nieuwste wint per record). Daarna sync: bij elke wijziging `upsert`, bij opstarten `select` sinds `updated_at`. Offline wijzigingen in een wachtrij in IndexedDB.

Tabellen: `trips (id, user_id, name, waypoints jsonb, hours_per_day, start_time, notes, updated_at)`, `logs (id, user_id, date, from, to, distance, duration, max_speed, avg_speed, track jsonb)`, `lesson_progress (user_id, lesson_id, read_at, quiz_score)`, `favourites (user_id, poi_id)`. Row Level Security: alleen eigen rijen.

### 6.2 Abonnement

Stripe Checkout (maandelijks, seizoen 92 dagen, jaar) met 14 dagen proef zonder kaart via een eigen `trial_until` in `subscriptions (user_id, status, plan, current_period_end, stripe_customer_id, trial_until)`. Netlify Function `stripe-webhook` verwerkt `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.payment_failed`. Stripe Customer Portal voor beheer. De app leest `subscriptions` bij opstarten en cachet `{ plus: boolean, until }` versleuteld (Web Crypto, sleutel per apparaat) in IndexedDB voor offline gebruik met een geldigheid van 7 dagen na `until`.

Checkout-tekst verplicht: 21 procent btw inbegrepen, en de instemming "Ik wil direct toegang en zie af van mijn herroepingsrecht" als checkbox.

### 6.3 Wat Plus ontgrendelt (gating)

Centrale functie `hasPlus()` en component `<PlusGate feature="...">` die inhoud vervangt door een nette uitleg plus knop "Probeer 14 dagen gratis". Gated: volledige lesmodules (secties na "In het kort"), quizzen, oefenexamen, certificaat, dagindeling met overnachtingen, Onderweg-overnachten en tankplanning, sync, GPX-export, real-time brugstatus. Nooit gated: routeplanner, navigatie, spraak, naderingskaart met korte checklist, bruglichten en noodinformatie, weer, checklists, favorieten.

Plus-lesinhoud verhuist van `lessons.ts` naar `public/plus/lessons-plus.json`, alleen opgehaald na een geldige sessie via Function `plus/content` (controleert abonnement, zet cache-headers privé). Gratis inhoud blijft in de bundel.

### 6.4 Extra Plus-inhoud (BOUWEN, content)

Oefenexamen Klein Vaarbewijs 1: minimaal 150 eigen meerkeuzevragen in 6 categorieën (wetgeving, vaarregels, betonning en borden, lichten en seinen, veiligheid, motor en techniek), examensimulatie van 25 vragen in 30 minuten, uitleg per antwoord, voortgang per categorie. Geen kopieën van CBR-vragen. Video's per module (korte clips, 1 tot 2 minuten, in `public/plus/video/` of via een privé Vimeo-link). Certificaat "Vaarmaat sluis- en brugpassage" als PDF na 80 procent op de quizzen van sluis, brug en marifoon (Function `plus/certificate` met pdf-lib).

Acceptatie: gast ziet bij een Plus-module de eerste sectie en een gate; na inloggen met actief abonnement laadt de volledige inhoud, ook offline na eerste keer; webhook-tests voor de vier Stripe-events; RLS-test dat gebruiker A de tochten van B niet kan lezen.

---

## 7. Reserveren (BOUWEN, fase 2 deeplinks, fase 3 aanvragen, fase 4 marktplaats)

### 7.1 Doel

Vanuit elke haven, hotel of restaurant in de app een plek regelen. Werkt voor gasten en Plus.

### 7.2 Fase 2: deeplinks

`stays.json` en `pois.json` krijgen een veld `book: { provider: 'jachthaven.nl'|'harby'|'booking'|'own', url }`. Bouw `scripts/enrich_booking.py` die op naam en plaats zoekt naar een pagina op Jachthaven.nl en Harby (handmatige tabel `data/booking_links.json`, aangevuld met een fuzzy match op naam) en voor hotels een Booking.com deeplink met affiliate-id opbouwt (`https://www.booking.com/searchresults.html?ss=<naam>&checkin=<datum>&checkout=<datum>&aid=<AID>`). Datums komen uit de tochtplanning (etappe-datum) of vandaag. Knop "Reserveren" in `PoiPanel` opent de link in een nieuw tabblad. Meet klikken (zie 8.3).

### 7.3 Fase 3: aanvragen via Vaarmaat

Voor een gecureerde set havens (start: 15 tot 25 havens in het Groene Hart die instemmen). Tabel `marinas (id, poi_id, name, contact_email, contact_phone, whatsapp, berths_visitor, max_length, price_per_night, price_rules jsonb, amenities jsonb, accepts_requests bool, auto_confirm bool)`. Flow: schipper kiest datum(s), bootlengte en breedte uit het profiel, aantal personen, opmerking → `booking_requests (id, marina_id, user_id, dates, boat jsonb, status: requested|confirmed|declined|expired|cancelled, price_estimate, created_at)` → Function `booking/request` stuurt mail (Resend) en optioneel WhatsApp (Twilio) naar de haven met twee links: bevestigen en afwijzen (ondertekende tokens, geldig 48 uur) → status-update en pushmelding/e-mail naar de schipper. Betaling in deze fase: bij bevestiging optioneel een aanbetaling via Stripe Checkout (servicefee 2,50 of 10 procent, instelbaar per haven), rest ter plaatse. In de app: status in het tochtoverzicht en in de naderingskaart bij aankomst ("gereserveerd, box 12, meld je bij de havenmeester").

Acceptatie: een aanvraag zonder reactie binnen 48 uur wordt `expired` en de schipper krijgt bericht; havenmeester kan zonder account bevestigen via de link; dubbele aanvraag voor dezelfde datum wordt geweigerd.

### 7.4 Fase 4: havendashboard en beschikbaarheid

Havenaccount (Supabase rol `marina_admin`), eenvoudige beschikbaarheidskalender (aantal vrije passantenplaatsen per dag), prijsregels, overzicht van aanvragen en boekingen, export. Beschikbaarheidsdata voedt de tochtplanner ("Kaag vol op 12 juli, alternatief Warmond"). Volledige betaling via Stripe Connect met uitbetaling aan de haven minus commissie.

---

## 8. Overige features

8.1 **Delen (BOUWEN, fase 2).** Route of tocht delen als link (`/t/<id>`, publiek leesbaar, alleen coördinaten en naam), als GPX en als afbeelding (kaart met route, canvas render). Ontvangers zonder account zien de route en kunnen hem openen in hun planner.

8.2 **Meldingen (BOUWEN, fase 3).** Web Push (VAPID) voor: bevestigde reservering, stremming op een bewaarde tocht binnen 48 uur, weerwaarschuwing (windkracht 6+) op de dag van een geplande tocht. Instelbaar per type.

8.3 **Analytics (BOUWEN, fase 1).** Privacyvriendelijk (Plausible of Umami, self-hosted of EU): events `route_planned`, `nav_started`, `nav_finished`, `lesson_opened`, `approach_shown`, `booking_click`, `plus_gate_shown`, `plus_started`. Geen locatiedata naar analytics.

8.4 **Verhuurmodus (BOUWEN, fase 4, B2B).** Verhuurder-account met vloot (bootprofielen), eigen instructies en huisregels per boot, verplichte korte instructie voor eerste vertrek, tochtlimiet (gebied waar de huurder mag varen, geofence met waarschuwing), en een overzicht van waar de boten zijn tijdens de huur (alleen met toestemming van de huurder, expliciet in de app). Prijs per boot per seizoen.

8.5 **Toegankelijkheid en taal.** Alle knoppen bereikbaar met toetsenbord, contrast volgens styleguide, spraak uitschakelbaar, teksten in `src/i18n/nl.ts` zodat Engels en Duits (toeristen, verhuur) later toegevoegd kunnen worden.

---

## 9. Fasering en definitie van klaar

**Fase 1 (statisch, geen backend).** 5 Onderweg (hotels, B&B, eten), 4.7 tankplanning en `fuel.json`, 8.3 analytics, 7.2 deeplinks voorbereiden (datavelden). Klaar als: build groen, screenshots op telefoon en desktop, testroutes ongewijzigd, README bijgewerkt.

**Fase 2 (data en Plus).** 4.1 bedieningstijden en BAS, 4.2 tijdafhankelijk routeren, 4.4 waterstanden, 4.6 kostenfunctie, 6 accounts en abonnement, 7.2 deeplinks live, 8.1 delen. Klaar als: webhook- en RLS-tests groen, Plus-gating handmatig getest als gast, proef en betalend; offline werkt na inloggen.

**Fase 3 (live en landelijk).** 4.3 real-time brugstatus, 4.5 plassen, 4.8 heel Nederland en Web Worker, 4.9 datacorrecties, 7.3 aanvragen, 8.2 meldingen.

**Fase 4 (marktplaats en B2B).** 7.4 havendashboard, 8.4 verhuurmodus.

Elke feature: TypeScript strict zonder `any`, geen console-errors in Playwright, Nederlandse UI-tekst volgens de styleguide, en een regel in `CHANGELOG.md`.

---

## 10. Datamodellen (samenvatting van `src/types.ts`, aanvullingen gemarkeerd)

```ts
GraphData { meta, nodes: LatLng[], comp: number[], edges: [a,b,len,wayIdx][], ways: WayInfo[], bridges: BridgeInfo[], locks: LockInfo[] }
WayInfo { n, t, h, d, w, s, nm?, nb?, c? /*CEMT, nieuw*/, wd? /*breedte, nieuw*/ }
BridgeInfo { n, h, m, e, p, o?: OpsInfo, ref?: { level, station } /*nieuw*/, rws?: string /*ISRS id, nieuw*/ }
LockInfo { n, e, p, o?: OpsInfo, rws?: string }
OpsInfo { oh?, vhf?, tel?, op?, web?, self?, note?, hours?: string /*opening_hours-formaat, nieuw*/ }
BoatProfile { type, name, height, draft, width, length /*nieuw*/, speed, allowMovable, bridgeWait, lockWait, margin, avoidUnknownBridges,
              tankLiters?, consumptionLph?, reserveFraction?, routing?: 'snel'|'rustig'|'toeristisch' /*nieuw*/ }
RouteRequest { from, to, fromPoint?, toPoint?, profile, alternatives?, departAt?: Date /*nieuw*/ }
RouteResult { ..., waitTime /*nieuw*/, fuelStops? /*nieuw*/, notices? /*BAS, nieuw*/ }
Poi { id, k, n, p, t, book?: { provider, url } /*nieuw*/ }
Stay { id, k, n, p, t, moor: { id, dist }, book? }            /*nieuw*/
Fuel { id, n, p, fuels[], opening_hours?, payment?, phone?, website?, notes?, verified? } /*nieuw*/
Subscription { plus: boolean, plan?, until?, trialUntil? }   /*nieuw*/
BookingRequest { id, marinaId, dates, boat, status, priceEstimate } /*nieuw*/
```

---

## 11. Bronnen en licenties

OpenStreetMap (ODbL): naamsvermelding verplicht, afgeleide data onder ODbL. OpenSeaMap tegels (CC BY-SA). Open-Meteo (CC BY 4.0, gratis voor niet-commercieel gebruik tot 10.000 calls per dag; bij commercieel gebruik het betaalde plan). Rijkswaterstaat Vaarweginformatie en NDW: open data, bronvermelding. Booking.com: affiliate-voorwaarden. Vaarregels: Binnenvaartpolitiereglement, Varen doe je Samen (eigen samenvattingen, geen letterlijke overname).
