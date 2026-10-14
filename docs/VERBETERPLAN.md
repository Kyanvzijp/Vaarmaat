# Vaarmaat: verbeterplan naar een professionele app

Versie 1.0, 12 oktober 2026. Dit document is het resultaat van een volledige check van de app (code, data, build, en schermen op telefoon en desktop). Het beschrijft wat er nu beter moet en wat verder ontworpen moet worden om van Vaarmaat een app te maken die schippers vertrouwen en waarvoor ze willen betalen. Alles staat in user stories met acceptatiecriteria, zodat je ze één voor één aan Claude Code of Lovable kunt geven.

Verhouding tot de andere documenten: `docs/SPEC.md` blijft leidend voor de features die daar al staan (bedieningstijden, tankplanning, Onderweg, reserveren). Dit plan vult aan wat daar ontbreekt (eerste gebruik, veiligheid, afwerking, kwaliteit, productie-eisen) en ontwerpt een aantal SPEC-features verder uit. Waar een story een SPEC-onderdeel raakt, staat dat erbij.

---

## 1. Samenvatting

**Het oordeel.** De kern is sterk en origineel: routering volledig in de browser met realistische tijden, alternatieven, uitleg waarom een brug blokkeert, een naderingskaart met de juiste les op het juiste moment, gedeelde rekenlogica tussen web en app, en alles offline. Build, lint en de routetest zijn groen. Wat Vaarmaat nu nog geen professionele app maakt, zit in zes dingen:

1. **Vertrouwen in de data.** Van 6.117 bruggen heeft 20 procent een bekende doorvaarthoogte. Van 583 beweegbare bruggen hebben er 13 bedieningstijden, van 192 sluizen 4. Op Kaag naar Leiden zijn 10 van de 12 bruggen "hoogte onbekend". Diepgang is bekend op 64 van de 7.693 vaarwegen. Van de 678 havens en aanlegplaatsen heeft 54 procent geen naam en 10 procent een telefoonnummer. De belofte "bruggen en sluizen met hoogte en bediening" wordt daardoor nog niet waargemaakt.
2. **Eerste gebruik en veiligheid.** Er is geen onboarding: de app neemt stil een sloep van 1,40 m aan. Een schipper met een boot van 2,60 m die het profiel nooit opent, krijgt routes onder te lage bruggen door. De disclaimer staat onderaan Instellingen en noodinformatie zit verstopt in een les.
3. **Navigatie-ervaring.** Als herberekenen mislukt, zit je vast zonder Stop-knop (web en app). Verder te veel meldingen (op Delft naar Loosdrecht zijn 39 van de 64 instructies vaste bruggen die je gewoon onderdoor vaart), geen automatisch herberekenen, geen aankomstscherm, het scherm gaat uit (geen Wake Lock), GPS blijft na het stoppen aan en de aankomsttijd springt omhoog zodra je stilligt voor een sluis.
4. **Design-afwerking.** Emoji als iconen en als logo, een ongestylede kaartlaagknop, sheets die je niet kunt slepen, de knop Start navigatie die op de telefoon onder de vouw valt, en een desktopversie die een uitgerekte telefoon is.
5. **Backend en verdienmodel niet aangesloten.** Inloggen, synchronisatie, Plus-status, `PlusGate` en analytics staan in de code, maar worden nergens in de UI gebruikt. Er is dus nog geen account, geen Plus en geen meetdata.
6. **Productie-eisen.** De app gebruikt de openbare OSM-tegelserver en Nominatim als zoek-terwijl-je-typt, allebei tegen het gebruiksbeleid in bij echte aantallen gebruikers. Open-Meteo is gratis alleen voor niet-commercieel gebruik. Er is geen privacyverklaring, geen foutmonitoring, geen unit- of end-to-end-tests buiten de routetest.

**Top 10 prioriteiten** (volgorde = bouwvolgorde):

| # | Wat | Story | Waarom eerst |
| --- | --- | --- | --- |
| 1 | Bekende bugs oplossen, te beginnen met vastlopen in navigatie | FIX-00 t/m FIX-17 | Klein werk, direct zichtbaar, voorkomt verkeerde indruk |
| 2 | Onboarding met bootprofiel en disclaimer | ONB-01, ONB-02 | Veiligheid: route klopt pas als de hoogte klopt |
| 3 | Noodscherm, altijd gratis en offline | VEI-01 | Wat je op het water direct nodig hebt |
| 4 | Doorvaarthoogtes en bedieningstijden uit RWS | DATA-01, DATA-02 | Kernbelofte van het product |
| 5 | Rustige, slimme navigatie met Wake Lock en herberekenen | NAV-01 t/m NAV-05 | De kern van "Google Maps voor het water" |
| 6 | Eigen tegelprovider en geocoder | TECH-01, PLAN-01 | Zonder dit wordt de app geblokkeerd bij groei |
| 7 | Eigen iconenset en logo, sleepbare sheets | DS-01 t/m DS-03 | Eerste indruk en vakmanschap |
| 8 | Foutmonitoring, tests in CI, Web Worker | TECH-02 t/m TECH-05 | Kwaliteit vasthouden terwijl je sneller bouwt |
| 9 | Privacy, voorwaarden, account verwijderen | JUR-01 t/m JUR-03 | Verplicht voor accounts en de app-winkels |
| 10 | Account, sync en Plus aansluiten | ACC-01 t/m ACC-05 | Verdienmodel, pas na 1 tot 9 |

---

## 2. Hoe er gekeken is

- **Code:** alle bestanden in `src/`, `mobile/src/`, `scripts/`, `supabase/` en `docs/` gelezen.
- **Controles:** `npm run build` en `npm run test:routes` groen; `npm run lint` geeft 0 fouten en 14 waarschuwingen (`Date.now()` tijdens renderen, `setState` in effects).
- **Schermen:** met Playwright 21 schermen op 420 × 820 en op 1280 × 800 doorlopen (start, zoeken, route, afslagen, dagindeling, aanleggen, weer, bootprofiel, haven, navigatie, tochten, leren, quiz, aan boord). In de testomgeving waren kaarttegels, Nominatim en Open-Meteo onbereikbaar; daardoor is ook het offline-gedrag zichtbaar geworden (lege grijze kaart, technische foutmelding bij het weer).
- **Data:** dekking geteld in `public/data/graph.json` en `pois.json` (cijfers in 3.2).
- **Prestaties:** graaf parsen 64 ms en indexeren 84 ms; Delft naar Loosdrecht (96 km, drie routes) 190 ms op een laptop. Op een middenklasse telefoon is dat 3 tot 5 keer zo lang, en het draait op de hoofdthread.

---

## 3. Bevindingen

### 3.1 Bugs en slordigheden (direct oplossen)

**Status: opgelost in 2.4 (14 oktober 2026)**, in web en app, zie `CHANGELOG.md`. Bij het testen kwamen er twee bij: aankomst werd gemeld als je ver van de route was (je positie viel dan op het eindpunt), en na "+ Tussenpunt" kon een oude blur-timer de zoeklijst van het nieuwe veld sluiten. Ook die zijn opgelost.

| ID | Wat | Waar | Gevolg |
| --- | --- | --- | --- |
| FIX-00 | Mislukt herberekenen tijdens navigatie (bijvoorbeeld positie te ver van het water) maakt de route leeg; navigatiepaneel, Stop-knop en tabbalk verdwijnen en je zit vast | `src/App.tsx:291` en `:452`, `src/index.css:190`; app: `mobile/src/App.tsx:339` | Alleen herladen of de app afsluiten helpt; ernstigste bug |
| FIX-01 | Succesmeldingen ("Tocht bewaard onder Mijn tochten", "Tocht opgeslagen in het logboek") staan in de rode foutstijl | `src/App.tsx:398` (`hint error` voor elk bericht) | Gebruiker denkt dat er iets misging |
| FIX-02 | Tussenpunt-instructie luidt "Tussenstop 1: via via Stille Rijn", met een rechtdoor-pijl, en wordt zo ook uitgesproken | `src/trip.ts:50` | Slordige tekst in de kern van de navigatie |
| FIX-03 | GPS-watch wordt nooit gestopt, ook niet na Stop of na "Mijn locatie" | `src/App.tsx:139`, geen `clearWatch` | Batterij loopt leeg, locatie-indicator blijft aan |
| FIX-04 | Aankomstmelding is tijdens navigatie niet zichtbaar (alleen gesproken); met spraak uit merk je niets | `src/App.tsx:213`, bericht staat alleen in de bovenbalk die tijdens navigatie verborgen is | Geen afsluiting van de tocht |
| FIX-05 | Resterende tijd en aankomsttijd springen omhoog bij stilliggen (sluis, brug): snelheid wordt dan 2 km/u en telt voor de helft mee | `src/navigation.ts:41-45` | Aankomsttijd onbetrouwbaar juist op wachtmomenten |
| FIX-06 | Dagindeling gaat automatisch aan bij een lange route, maar nooit meer uit | `src/App.tsx:123` | Verwarrend na een kortere route |
| FIX-07 | Technische fouttekst in de UI: "Weer niet beschikbaar (Failed to fetch)" | `src/components/WeatherCard.tsx:20` | Engels en technisch, tegen de styleguide |
| FIX-08 | Tochten en logboekitems worden zonder bevestiging en zonder ongedaan maken gewist | `TripsView.tsx:58`, `MoreView.tsx:84` | Onherstelbaar dataverlies met één tik |
| FIX-09 | Naam van een tocht vragen met `window.prompt` | `src/App.tsx:302` | Ziet er onaf uit, werkt slecht op mobiel |
| FIX-10 | Op de telefoon valt Start navigatie onder de vouw van de ingeklapte routesheet; subtabs van Aan boord lopen buiten beeld op 420 px | `src/index.css:86-91`, schermen 04 en 18 | Belangrijkste actie niet zichtbaar |
| FIX-11 | Zoeken roept Nominatim aan bij elke toetsaanslag (na 250 ms) | `src/components/SearchBox.tsx:36`, `src/geocode.ts:66` | Nominatim verbiedt autocomplete en staat maximaal 1 verzoek per seconde toe: risico op blokkade |
| FIX-12 | Gevaren spoor staat alleen in het geheugen; herladen of afsluiten tijdens de tocht en het logboek is leeg | `src/App.tsx` (state `track`) | Op iOS sluit het systeem achtergrond-PWA's regelmatig |
| FIX-13 | Ongebruikte bestanden uit de Vite-template | `src/assets/hero.png`, `src/assets/vite.svg` | Opruimen |
| FIX-14 | 14 lintwaarschuwingen | `RoutePanel`, `NavPanel`, `SearchBox`, `WeatherCard` (web en app) | Onrustige renders, minder voorspelbaar |
| FIX-15 | Met GPS aan laadt het weer onder Aan boord niet: elke positie is een nieuw array, dus de ophaalactie wordt elke seconde afgebroken | `src/App.tsx:325`; app: `mobile/src/App.tsx:384` | Weer leeg precies als je aan boord bent |
| FIX-16 | GPX-export zonder tijden per punt en zonder escaping van `&` en `<` in namen | `gpx()` in `src/components/MoreView.tsx` en de app | Bestand ongeldig bij "Kaag & Braassem", onbruikbaar in andere apps |
| FIX-17 | Na herberekenen komen naderingskaart en spraak voor dezelfde sluis opnieuw (sleutels hangen af van afstand vanaf de start) | `src/App.tsx` (`approachedRef`, `spokenRef`) en de app | Dubbele meldingen |

### 3.2 Data en vertrouwen

| Gegeven | Dekking nu | Gevolg |
| --- | --- | --- |
| Bruggen met doorvaarthoogte | 1.197 van 6.117 (20 procent) | Op populaire routes is de meerderheid "onbekend" |
| Beweegbare bruggen met bedieningsinfo | 331 van 583; met bedieningstijden 13 | "Bediend tot 18:00" kan nu bijna nergens |
| Sluizen met bedieningsinfo | 97 van 192; met tijden 4 | Idem |
| Vaarwegen met diepgang | 64 van 7.693 | Diepgangcontrole werkt in de praktijk niet |
| Vaarwegen met maximumsnelheid | 597 | Bruikbaar voor een snelheidswaarschuwing (NAV-06) |
| Havens en aanlegplaatsen (678) met naam | 310 (46 procent) | Lijsten vol "Jachthaven", "Aanlegplaats" |
| ... met telefoon / website / liggeld / sanitair | 66 / 146 / 25 / 0 | Detailpaneel meestal leeg |
| Tankstations / vuilwaterstations | 23 / 26 | Tankplanning (SPEC 4.7) heeft te weinig punten |

Daarnaast:
- **Het bootprofiel wordt stil aangenomen.** Iedere nieuwe gebruiker vaart als "Mijn sloep, 1,40 m" totdat het profiel handmatig wordt aangepast.
- **De disclaimer** ("de schipper blijft verantwoordelijk") staat onderaan Instellingen en wordt nooit bevestigd.
- **Noodinformatie** (112, kanaal 16, KNRM, Kustwacht) staat alleen in de les Veiligheid. Er is geen plek die in twee tikken je positie geeft om door te geven.
- **Geen herkomst per gegeven.** Je ziet niet of een hoogte uit OSM, van RWS of van een andere schipper komt, of wanneer hij gecontroleerd is.

### 3.3 UX en design

- **Eerste indruk.** Een ⚓-emoji als logo in plaats van het beeldmerk uit de styleguide; de app opent zonder uitleg op een kaart (offline: een lege grijze vlakte).
- **Iconen.** Emoji overal (tabbalk, stappen, POI's, knoppen), wisselend per platform en lettertype. De styleguide (hoofdstuk 6) vraagt een eigen lijnset.
- **Sheets.** Alleen in- en uitklappen door op het handvat te tikken; niet slepen, geen tussenstanden, geen veeggebaar om te sluiten.
- **Routesheet.** De drie alternatieven en twee waarschuwingen nemen de bovenste helft in; de primaire actie zakt weg. Waarschuwingen staan in grijze vlakken en lijken op elkaar.
- **Kaart.** De standaard laagknop van Leaflet past niet bij de rest; geen legenda, geen filter op soort voorziening, geen clustering, geen nauwkeurigheidscirkel rond de boot, geen lang-drukken om een bestemming te kiezen, hoogtes van bruggen alleen via een tooltip (op touch slecht bereikbaar).
- **Zoeken.** Havens, bruggen en sluizen uit de eigen data zijn niet vindbaar ("Sleepboothaven", "Zijlbrug"). Geen recente zoekopdrachten of favoriete plekken in de lijst. Geen toetsenbordbediening van de resultaten.
- **Lege staten.** Tochten en logboek tonen alleen een grijze zin, geen illustratie en geen directe actie.
- **Desktop.** De tabbalk loopt over de volle breedte onderaan, planner en routesheet zweven als twee losse kaarten. Een professionele desktopversie heeft een zijpaneel met alles onder elkaar.
- **Donkere modus en nachtnavigatie** ontbreken (styleguide 2 en 8 noemen ze).
- **Toegankelijkheid.** 8 `aria`-attributen in alle componenten samen; knoppen met alleen een emoji (🔊, ☆, ×, –); sluitknoppen van 30 px (minimaal 44 px); geen focusring; geen `prefers-reduced-motion`.

### 3.4 Navigatie

- **Te veel instructies.** Elke vaste brug is een stap en wordt uitgesproken, ook als er meters ruimte is.
- **Geen automatisch herberekenen** bij afwijken; alleen een knop.
- **Geen aankomstmoment**: geen samenvatting, geen voorstel om aan te leggen of het logboek te bekijken.
- **Scherm gaat uit**: geen Wake Lock; geen haptiek (styleguide 8 en 10 vragen beide).
- **Geen snelheidswaarschuwing** terwijl de maximumsnelheid voor 597 vaarwegen bekend is en grachten op 6 km/u staan.
- **Geen koers-omhoog**, geen inzoomen vlak voor een afslag, geen "rijstrookadvies" (stuurboordwal houden, welke doorvaartopening).
- **Navigatie overleeft geen herstart**: na herladen ben je route, spoor en voortgang kwijt.

### 3.5 Techniek en kwaliteit

- `App.tsx` (513 regels) bevat de hele navigatielogica in één effect; de Expo-app heeft een eigen kopie. Dat moet een gedeelde module in `src/` worden.
- Routering op de hoofdthread (SPEC 4.8 vraagt al een Web Worker); bij heel Nederland onhoudbaar.
- Tests: alleen de routetest. Geen unit-tests voor navigatie, dagindeling, weer-advies of opmaak; de screenshot-test draait niet in CI.
- Geen error boundary en geen foutmonitoring: een crash op het water is een wit scherm en jij weet het niet.
- De service worker werkt zichzelf bij zonder melding; er is geen versienummer zichtbaar.
- Teksten staan in de componenten (SPEC 8.5 vraagt `src/i18n/nl.ts`).
- De backendlaag (`src/backend/*`, `PlusGate`, `track()`) is gebouwd maar nergens aangeroepen.

### 3.6 Juridisch, licenties en privacy

- `tile.openstreetmap.org` is niet bedoeld voor een app met veel gebruikers; voor web en app is een tegelprovider nodig (MapTiler, Stadia, of eigen vectortegels).
- Nominatim: geen autocomplete en maximaal 1 verzoek per seconde. Voor Nederland is de **PDOK Locatieserver** (overheid, gratis, met suggest-functie) de logische vervanger, aangevuld met een eigen index van havens, bruggen, sluizen en vaarwegen.
- Open-Meteo is gratis voor niet-commercieel gebruik; met Plus is Vaarmaat commercieel, dus een betaald plan of een andere bron.
- Esri-satellietbeelden: controleer de gebruiksvoorwaarden voor commercieel gebruik, of kies het luchtfoto-product van PDOK (Nederland, open data).
- Er is geen privacyverklaring, geen gebruiksvoorwaarden, geen colofon (KvK, contact) en geen manier om een account en data te verwijderen. Apple eist dat laatste voor elke app met accounts.
- Het logboek bevat gevaren sporen (locatiedata). Met sync komen die in Supabase: dat vraagt een EU-regio, een bewaartermijn en een duidelijke uitleg.

### 3.7 Mobiele app (Expo)

Zie hoofdstuk 5, epic APP, voor de stories. Samenvatting van de review van `mobile/`:

- **Functioneel bijna gelijk aan het web**, maar `mobile/src/App.tsx:123-367` is bijna regel voor regel een kopie van `src/App.tsx:86-322` (routeren, GPS, navigatie-effect, logboek, tussenpunten), net als `gpx()`, `STEP_ICONS` en het type `Approach`. Elke fix moet nu twee keer. Oplossing in TECH-05.
- **Dezelfde bugs als het web**: vastlopen na mislukt herberekenen, aankomst alleen hoorbaar, GPS blijft na Stop elke seconde actief (geen `AppState`-afhandeling), succesmeldingen in foutstijl, wissen zonder bevestiging, spoor alleen in geheugen.
- **Kaart**: OSM-tegels zonder eigen User-Agent; Android draait op `mapType 'none'`, dus bij blokkade is de kaart leeg. De verplichte bronvermelding (OSM, Google-logo, Apple "Legal") valt onder tabbalk en sheets: er is geen `mapPadding`. Geen tegelcache (`tileCachePath`), terwijl het web 30 dagen cachet.
- **Platform**: geen achtergrondlocatie, geen crashrapportage of error boundary, geen `expo-updates` (elke tekstfix vraagt een winkelrelease), Android-build gaat stil door zonder Maps-sleutel, geen uitleg vooraf bij locatietoestemming en geen knop naar instellingen bij weigering, Android-terugknop sluit de app tijdens navigatie, toetsenbord bedekt velden in de sheets.
- **Spraak**: `voiceAvailable()` geeft altijd waar, de audiosessie is niet ingesteld (stilschakelaar dempt instructies, muziek stopt in plaats van zachter te gaan), en een nieuwe melding breekt een naderingsmelding af. De spraakdrempels (250 m en 40 m) wijken af van styleguide 8 (600 m, 150 m, bij de afslag).
- **Prestaties**: elke GPS-fix rendert de hele app en tot 600 markers opnieuw (inline handler maakt `memo` nutteloos), de bootmarker heeft geen `tracksViewChanges={false}`, de 3 MB graaf staat als ruwe JSON in het geheugen, en elke toetsaanslag in het bootprofiel herberekent de route.
- **Winkel**: icoon is 512 px met alfakanaal (Apple wil 1024 px zonder), geen splash, geen `locales` (winkel toont de app als Engels), geen privacy manifest, `supportsTablet: true` zonder tabletlayout (iPad-screenshots verplicht), versienummer niet zichtbaar, `submit.production` leeg, Outfit wordt niet geladen, navigatiegetallen zijn 16 px (styleguide: minstens 20).
- **Toegankelijkheid**: knoppen van 32 en 34 px, geen `accessibilityRole` op chips, kaarten en quizopties, zoekvelden heten "A" en "B" voor VoiceOver, de instructiebalk is geen live region, emoji `⬑` en `⬏` ontbreken op veel Android-lettertypen.

---

## 4. Persona's

| Persona | Wie | Wat ze nodig hebben |
| --- | --- | --- |
| **Sanne, huurder** | 34, huurt voor het eerst een sloep op de Kaag, geen vaarbewijs, wil met vrienden naar Leiden lunchen | Geruststelling, simpele uitleg, weten waar je mag aanleggen en wat je bij een brug moet doen |
| **Kees, eigenaar** | 61, motorjacht van 2,60 m hoog, vaart elk weekend en twee weken per zomer | Betrouwbare hoogtes en bedieningstijden, meerdaagse planning, havens met prijs en voorzieningen, logboek |
| **Ruud, zeiler** | 45, zeilboot met staande mast, vaart in konvooi door staande-mastroutes | Bediende bruggen in volgorde, konvooitijden, wachtplaatsen, diepgang |
| **Marieke, havenmeester** | Jachthaven in het Groene Hart, 20 passantenplaatsen | Aanvragen zonder gedoe, minder telefoontjes, goede gegevens in de app |

---

## 5. Epics en user stories

Opbouw van elke story: **ID en titel**, de story zelf, **prioriteit** (MoSCoW), **omvang** (S = tot een dag, M = 2 tot 4 dagen, L = 1 tot 2 weken, XL = meer), **gratis of Plus**, **acceptatiecriteria** en waar nodig **ontwerp** en **raakt** (bestanden of SPEC-onderdelen). Alle UI-tekst volgens de styleguide: Nederlands, je-vorm, geen streepjes als leesteken.

### Epic FIX: fundament op orde (sprint 0)

De bugs uit 3.1 zijn kleine, losse taken. Eén story per bug is overdreven; de acceptatiecriteria hieronder dekken ze allemaal.

#### FIX: bekende bugs oplossen
**Als** gebruiker **wil ik** dat meldingen, teksten en knoppen kloppen **zodat** de app betrouwbaar overkomt.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Een mislukte herberekening laat de oude route staan en toont in de navigatiebalk "Geen nieuwe route gevonden. Vaar terug naar de route of stop de navigatie."; de Stop-knop is altijd zichtbaar zolang `navigating` waar is, ook zonder route. Playwright-test: herbereken met een positie op land.
- Bericht-state krijgt een soort (`info`, `succes`, `fout`); succes in `--ok-bg`, fout in `--err-bg`, verdwijnt na 4 seconden (styleguide 10). Ook zichtbaar tijdens navigatie als toast onder de instructiebalk.
- Een tussenpunt wordt een eigen staptype `waypoint` met eigen icoon en tekst "Tussenpunt 1 bereikt: Leiden centrum"; spraak zegt hetzelfde.
- `clearWatch` bij Stop en wanneer geen enkel onderdeel de positie meer nodig heeft; locatie-indicator van het toestel gaat uit.
- Bij aankomst verschijnt het aankomstscherm (NAV-04); zonder spraak is aankomst dus ook zichtbaar.
- Resterende tijd gebruikt bij snelheid onder 1,5 km/u alleen de geplande tijd plus de tijd dat je al stilligt; geen sprong bij een sluis. Unit-test met een reeks posities waarin de boot 10 minuten stilligt.
- De dagindeling volgt de route: aan als de route langer is dan het dagbudget, uit als dat niet meer zo is, tenzij de gebruiker hem zelf heeft omgezet.
- Foutteksten zijn Nederlands en zeggen wat je kunt doen: "Geen verbinding. Het weer laadt zodra je weer online bent." Geen technische tekst uit `Error.message` in de UI.
- Wissen van een tocht of logboekitem toont een melding "Tocht gewist" met de knop "Ongedaan maken" (8 seconden).
- Tochtnaam via een eigen dialoog in de stijl van de app, met voorgestelde naam en knop "Bewaren".
- Op 375 × 667 (iPhone SE) zijn routesamenvatting en Start navigatie zichtbaar zonder scrollen; subtabs passen of scrollen zichtbaar horizontaal met een vervaagde rand.
- Zoeken gebruikt eerst de lokale index en roept een externe geocoder pas aan na Enter of na 600 ms stilte, nooit vaker dan eens per seconde (definitieve oplossing in PLAN-01).
- Spoor en navigatiestatus worden elke 15 seconden lokaal bewaard (zie NAV-08).
- Weerpunt is stabiel: afgerond op 0,01 graad en alleen nieuw als het meer dan 2 km verschuift.
- GPX bevat `<time>` per punt en een geldige, ge-escapete naam; getest door het bestand te valideren tegen het GPX 1.1-schema.
- Meldingen en naderingskaarten hebben een sleutel per object (brug- of sluis-id), niet per positie op de route.
- Ongebruikte assets weg, lint zonder waarschuwingen.
- Raakt: `src/App.tsx`, `src/trip.ts`, `src/navigation.ts`, `src/components/*`, `mobile/src/*`.

---

### Epic ONB: eerste gebruik en vertrouwen

#### ONB-01 Bootprofiel instellen bij eerste start
**Status: gebouwd in 2.5**, web en app. Afwijkingen: de huurboot krijgt nog niet de module "Eerste keer varen" (dat is LEER-02), maar een scherm met de vertrekchecklist en de lessen Voorrang en Veiligheid. Boottypes hebben nog emoji in plaats van illustraties (DS-01).
**Als** nieuwe gebruiker (Sanne, Kees) **wil ik** bij de eerste start in een paar stappen mijn boot instellen **zodat** de app alleen routes voorstelt waar mijn boot echt onderdoor en doorheen past.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Eerste start toont drie schermen: (1) welkom met de belofte in één zin, (2) boottype kiezen met illustraties, (3) hoogte boven water, diepgang en kruissnelheid bevestigen, met de standaardwaarden van het type ingevuld.
- Bij hoogte staat een uitleg met een kleine tekening: "Meet van de waterlijn tot het hoogste punt: kap, mast, antenne of bimini."
- "Ik weet het niet precies" kiest de standaard van het type en markeert de hoogte als geschat; de app herinnert er bij de eerste route aan. (Eerst stond hier ook "zet Vermijd bruggen met onbekende hoogte aan". Bij het bouwen bleek dat met de huidige data maar 1 van de 8 testroutes voor een sloep en 0 van de 8 voor een motorjacht dan nog een route heeft. Pas na DATA-01 is dat een redelijke standaard.)
- Overslaan kan, maar dan toont de eerste route een gele balk "Je route is berekend voor een sloep van 1,40 m. Klopt dat?" met de knop "Boot instellen".
- Huurmodus: vraag "Is dit een huurboot?"; zo ja, toont de app na de onboarding de korte module "Eerste keer varen" (LEER-02).
- Na afronden staat er een vinkje in het profiel `onboardedAt`; opnieuw doorlopen kan via Aan boord, Instellingen.
- Werkt op web en in de app; getest op 375 × 667 en 1280 × 800.
- Raakt: nieuw `src/components/Onboarding.tsx`, `mobile/src/components/Onboarding.tsx`, `src/profile.ts`, `src/store.ts`.

#### ONB-02 Disclaimer en verantwoordelijkheid bevestigen
**Status: gebouwd in 2.5.** De links naar voorwaarden en privacyverklaring wachten op JUR-01; tot die tijd verwijst het scherm naar Aan boord, Instellingen, Over Vaarmaat.
**Als** aanbieder **wil ik** dat de gebruiker één keer bevestigt dat de app een hulpmiddel is **zodat** de verantwoordelijkheid helder is en we juridisch afgedekt zijn.
Prioriteit: Must · Omvang: S · Gratis

Acceptatiecriteria:
- Laatste onboardingscherm: drie korte punten (gegevens kunnen afwijken, borden en brugwachters gaan voor, jij bent de schipper) en de knop "Begrepen, laten we varen".
- Versienummer van de tekst wordt bewaard; bij een inhoudelijke wijziging vraagt de app opnieuw.
- Links naar de volledige voorwaarden en privacyverklaring (JUR-01).
- Geen blokkerende pop-up bij elke start.

#### ONB-03 Uitleg bij eerste gebruik van elk hoofdonderdeel
**Als** nieuwe gebruiker **wil ik** bij de eerste keer dat ik een onderdeel open één korte tip zien **zodat** ik ontdek wat de app kan zonder een handleiding te lezen.
Prioriteit: Should · Omvang: S · Gratis

Acceptatiecriteria:
- Eén tip per onderdeel, maximaal één tegelijk, wegtikbaar en nooit meer opnieuw: routesheet ("Sleep omhoog voor afslagen, dagindeling en aanleggen"), naderingskaart, Leren, logboek.
- Tips zijn uit te zetten in Instellingen.
- Geen tips tijdens navigatie.

#### ONB-04 Offline-gereedheid zichtbaar maken
**Als** schipper **wil ik** zien of de app klaar is om offline te varen **zodat** ik niet midden op de plas zonder kaart of route sta.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- In Aan boord een kaart "Offline klaar" met drie regels: vaarwegen en havens (bijgewerkt op datum), kaart van je route (wel of niet gedownload), lessen (ja).
- Bij het bewaren van een tocht en bij Start navigatie downloadt de app de kaarttegels in een corridor van 2 km rond de route tot zoom 16 (zie KAART-06), met voortgang.
- Zonder verbinding toont de bovenbalk een rustige balk "Offline. Routes en navigatie werken gewoon." in plaats van foutmeldingen per onderdeel.

---

### Epic VEI: veiligheid aan boord (altijd gratis en offline)

#### VEI-01 Noodscherm met positie
**Status: gebouwd in 2.5**, web en app. Te openen vanuit Aan boord (bovenaan) en met een vaste knop Nood in de navigatiebalk. KNRM Helpt opent nu de website van de KNRM; de deeplink naar de app nog controleren. Laat de teksten over marifoonkanalen en de Mayday-volgorde voor de release nakijken door iemand met een marifooncertificaat of door de KNRM.
**Als** schipper in nood **wil ik** met twee tikken mijn positie en de juiste nummers zien **zodat** ik snel hulp kan halen en precies kan zeggen waar ik ben.
Prioriteit: Must · Omvang: M · Gratis, offline

Acceptatiecriteria:
- Knop "Nood" altijd bereikbaar: in de tabbalk onder Aan boord als eerste kaart en tijdens navigatie via een lang-drukken op de Stop-knop of een vaste rode knop in de navigatiebalk.
- Scherm toont groot: positie in graden en decimale minuten (52° 13,00′ N 4° 35,60′ O) en in decimale graden, de naam van de vaarweg of plas waar je bent, en de dichtstbijzijnde bekende plaats of brug ("400 m ten zuiden van Zijlbrug").
- Knoppen: "Bel 112", "Bel Kustwacht 0900 0111", "KNRM Helpt" (deeplink of winkel), "Deel positie" (sms of deelmenu met tekst en kaartlink).
- Mayday-tekst voor de marifoon, ingevuld met bootnaam en positie, om voor te lezen.
- Werkt zonder internet; positie ook zonder route.
- Nooit achter een Plus-gate (CLAUDE.md, SPEC 6.3).
- Raakt: nieuw `src/components/EmergencyView.tsx` en de app-versie, `src/geo.ts` (`formatDegMin`).

#### VEI-02 Man-over-boord-knop
**Als** schipper **wil ik** met één tik de positie vastleggen waar iemand overboord ging **zodat** ik daar gericht naartoe kan terugvaren.
Prioriteit: Should · Omvang: S · Gratis, offline

Acceptatiecriteria:
- In navigatie en op het noodscherm: knop "Man over boord".
- Zet een rode markering op de kaart, toont afstand en koers terug naar dat punt, groot en continu bijgewerkt.
- Spreekt "Man over boord. Keer om. Afstand 40 meter." en herhaalt elke 20 seconden de afstand.
- Toont de korte instructie uit de les Veiligheid (terugkeren, aan lijzijde oppikken, 112 bij twijfel).
- Uitzetten alleen met bevestiging.

#### VEI-03 Weeradvies voor de hele tocht, met waarschuwing vooraf
**Als** schipper **wil ik** het vaaradvies zien voor het tijdvak en de plek van mijn tocht, niet alleen voor nu bij vertrek **zodat** ik niet op de Kagerplassen in windkracht 6 terechtkom.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Het advies (`assess` in `src/weather.ts`) gebruikt de geplande vertrektijd en duur, en weerpunten om de 10 km langs de route.
- Grote plassen op de route krijgen een strengere drempel (windkracht 5 is daar al "Let op" voor open boten).
- Routesheet toont bovenaan één regel: "Goed vaarweer" (groen) of "Let op: windkracht 5 op de Westeinder rond 14:00" (oranje), tikken opent het weertabblad.
- Bij een opgeslagen tocht voor morgen of later toont Tochten het advies voor die dag (met een melding, zie ACC-07).
- Onweer of windkracht 6 en hoger: rode balk met advies "Niet varen of dicht bij een haven blijven" en de dichtstbijzijnde havens langs de route.
- Licht verplicht: als de aankomsttijd na zonsondergang ligt, waarschuwing "Je komt aan na zonsondergang (20:12). Voer navigatieverlichting." 

#### VEI-04 Waarschuwing beroepsvaart en drukke vaarwegen
**Als** onervaren schipper **wil ik** vooraf weten dat mijn route over een vaarweg met beroepsvaart gaat **zodat** ik me kan voorbereiden.
Prioriteit: Should · Omvang: M · Gratis · Raakt SPEC 4.6

Acceptatiecriteria:
- CEMT-klasse in `WayInfo.c` via `build_graph.py` (SPEC 4.6).
- Meer dan 2 km over CEMT IV of hoger: waarschuwing in de routesheet met tik naar de les Voorrang.
- Tijdens navigatie, 1 km voor het opvaren: "Je vaart zo de Oude Rijn op. Hier vaart beroepsvaart. Houd stuurboordwal."
- Profiel "Rustig" (SPEC 4.6) vermijdt deze vaarwegen waar het kan.

---

### Epic PLAN: zoeken en plannen

#### PLAN-01 Eigen zoekindex plus PDOK
**Als** gebruiker **wil ik** havens, bruggen, sluizen, vaarwegen en adressen in één zoekveld vinden **zodat** ik mijn bestemming snel kan kiezen, ook zonder internet.
Prioriteit: Must · Omvang: L · Gratis

Acceptatiecriteria:
- Build-script maakt `public/data/search.json`: alle benoemde havens, aanlegplaatsen, bruggen, sluizen, plassen en vaarwegen, met soort, plaats en positie. Fuzzy zoeken lokaal (zonder externe bibliotheek of met een kleine, bijvoorbeeld een trigram-index).
- Adressen en plaatsen via de PDOK Locatieserver (suggest, alleen Nederland), maximaal eens per 300 ms; bij geen verbinding alleen lokaal en een regel "Adressen zoeken lukt weer zodra je online bent".
- Resultaten gegroepeerd: Havens, Bruggen en sluizen, Vaarwegen, Adressen; met icoon en plaatsnaam ("Zijlbrug, Leiden, beweegbaar, 1,10 m").
- Toetsenbord: pijltjes, Enter, Escape. Schermlezer leest het aantal resultaten.
- Nominatim niet meer als zoek-terwijl-je-typt.
- Zoeken "Zijlbrug" of "Sleepboothaven" geeft het object als eerste resultaat.
- Raakt: `src/geocode.ts`, `src/components/SearchBox.tsx`, nieuw script `scripts/build_search.py`.

#### PLAN-02 Recente en favoriete plekken
**Als** vaste vaarder (Kees) **wil ik** mijn thuishaven en recente bestemmingen direct in het zoekveld zien **zodat** ik niet steeds hoef te typen.
Prioriteit: Should · Omvang: S · Gratis

Acceptatiecriteria:
- Leeg zoekveld toont: Mijn locatie, Kies op de kaart, Thuishaven (instelbaar), favorieten (sterren uit havens), laatste 5 bestemmingen.
- Thuishaven instellen vanuit het havenpaneel ("Maak thuishaven") en in Instellingen.
- Recente plekken worden lokaal bewaard en zijn te wissen.

#### PLAN-03 Bestemming kiezen door lang te drukken op de kaart
**Als** gebruiker **wil ik** lang op de kaart drukken en "Vaar hierheen" kiezen **zodat** ik zonder zoeken een punt op het water kan kiezen.
Prioriteit: Should · Omvang: S · Gratis

Acceptatiecriteria:
- Lang drukken (500 ms) of rechtsklik op desktop toont een klein menu bij het punt: "Vaar hierheen", "Vertrek hier", "Tussenpunt toevoegen".
- Punt wordt op het water gezet (`nearestNode`); ligt het verder dan 150 m van het water, dan toont het menu "Dichtstbijzijnde vaarweg: 320 m".
- Naam van het punt: de vaarweg of plas ("Punt op de Kagerplassen") in plaats van coördinaten.

#### PLAN-04 Vertrektijd en datum kiezen
**Als** schipper **wil ik** een vertrekdatum en tijd kiezen **zodat** aankomsttijd, weer en (later) bedieningstijden kloppen voor het moment dat ik echt vaar.
Prioriteit: Must · Omvang: M · Gratis · Raakt SPEC 4.2

Acceptatiecriteria:
- In de routesheet een regel "Vertrek nu" die opent naar een keuze voor datum en tijd (standaard: nu, of de standaard vertrektijd uit Instellingen als je voor een andere dag plant).
- `RouteRequest.departAt` (SPEC 4.2) wordt doorgegeven; aankomsttijd, dagindeling en weer gebruiken deze tijd.
- Ook "Aankomen om": de app rekent terug en toont de vertrektijd.
- Opgeslagen tochten bewaren datum en tijd.

#### PLAN-05 Meerdere boten
**Als** eigenaar die ook huurt, of als verhuurder **wil ik** meerdere bootprofielen bewaren en snel wisselen **zodat** ik niet elke keer alles opnieuw invul.
Prioriteit: Could · Omvang: M · Gratis (sync van profielen via Plus)

Acceptatiecriteria:
- Lijst van boten in het profielpaneel, één actief; wisselen vanuit de bovenbalk.
- Profiel krijgt lengte (SPEC 4.6), en optioneel tankinhoud en verbruik (SPEC 4.7).
- Een opgeslagen tocht onthoudt met welke boot hij gepland is en waarschuwt als je met een andere boot opent.

#### PLAN-06 Routevoorkeur Snel, Rustig, Toeristisch
Zie SPEC 4.6. Aanvulling voor het ontwerp: drie chips boven de alternatieven, met één zin uitleg per keuze en het verschil in tijd ("+12 min, vermijdt het Amsterdam-Rijnkanaal"). Prioriteit: Should · Omvang: L.

---

### Epic KAART: routeresultaat en kaart

#### KAART-01 Routesheet opnieuw ontworpen
**Als** gebruiker **wil ik** in één oogopslag tijd, afstand, aankomst en of mijn boot overal past zien, met de startknop altijd in beeld **zodat** ik snel kan beslissen en vertrekken.
Prioriteit: Must · Omvang: M · Gratis

Ontwerp:
- Kop: "1 u 55 min" (Kop 1), daaronder "12,7 km · aankomst 13:40 · 10 min wachten".
- Eén statusregel met icoon: groen "Past overal onder" of oranje "1 brug moet open" of grijs "10 bruggen met onbekende hoogte" (tik voor details).
- Alternatieven als compacte chips op één regel (horizontaal scrollbaar), niet als drie grote kaarten.
- Start navigatie en Bewaren vast onderaan de sheet (sticky), ook als je scrolt.
- Subtabs: Overzicht, Afslagen, Dagindeling, Aanleggen, Weer; tabnamen zonder getallen die steeds verspringen.

Acceptatiecriteria:
- Op 375 × 667 zijn kop, statusregel, alternatieven en Start navigatie zichtbaar zonder scrollen.
- De statusregel gebruikt nooit alleen kleur (styleguide 11).
- Waarschuwingen zijn gesorteerd op ernst (fout, let op, info) en maximaal twee zichtbaar; de rest achter "Nog 2 meldingen".

#### KAART-02 Sleepbare sheets
**Als** telefoongebruiker **wil ik** sheets omhoog en omlaag kunnen slepen en wegvegen **zodat** ik de kaart en de details naar behoefte kan zien.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Drie standen: piek (alleen kop en startknop), half (46 procent), vol (78 procent), zoals styleguide 5.
- Slepen aan het handvat en aan de kop; snel omlaag vegen vanaf piek sluit niet de route maar laat de piek staan.
- Volgt de vinger zonder vertraging, klikt naar de dichtstbijzijnde stand, 150 tot 200 ms ease-out, en uit bij `prefers-reduced-motion`.
- Toetsenbord en schermlezer: het handvat is een knop met "Meer tonen" en "Minder tonen".
- In de app: zelfde gedrag met `react-native-gesture-handler` of een bestaande bottom-sheet.

#### KAART-03 Bruggen en sluizen zichtbaar op de kaart
**Als** schipper **wil ik** op de kaart bij elke brug de hoogte zien **zodat** ik zonder tikken weet waar het krap wordt.
Prioriteit: Should · Omvang: M · Gratis

Acceptatiecriteria:
- Vanaf zoom 14 staat bij bruggen op de route een labeltje met de hoogte ("2,50"); rood omrand als hij lager is dan boot plus marge, oranje als beweegbaar en moet open, grijs met "?" als onbekend.
- Tikken op een brug of sluis opent een detailpaneel zoals bij havens: hoogte, bediening, marifoon, bron en datum (DATA-04), "Klopt dit niet?" (DATA-03).
- Ook bruggen en sluizen buiten de route zijn vanaf zoom 15 tikbaar.

#### KAART-04 Kaartlagen, legenda en filters
**Als** gebruiker **wil ik** zelf kiezen welke voorzieningen ik op de kaart zie **zodat** de kaart rustig blijft en ik vind wat ik zoek.
Prioriteit: Should · Omvang: M · Gratis

Acceptatiecriteria:
- Eigen laagknop in de stijl van de app (vervangt de Leaflet-standaard): basiskaart (kaart, luchtfoto), OpenSeaMap aan of uit, en filters: Overnachten, Tanken en water, Vuilwater, Trailerhelling, Winkels en werven, Verboden.
- Legenda in hetzelfde paneel met de iconen en hun betekenis.
- Clustering van markers onder zoom 14 met het aantal in de cluster.
- Keuzes worden bewaard.

#### KAART-05 Boot op de kaart: nauwkeurigheid en richting
**Als** schipper **wil ik** zien hoe nauwkeurig mijn positie is en welke kant ik op vaar **zodat** ik weet hoeveel ik op de stip kan vertrouwen.
Prioriteit: Should · Omvang: S · Gratis

Acceptatiecriteria:
- Lichtblauwe cirkel met de nauwkeurigheid (`coords.accuracy`) rond de boot.
- Bij stilliggen of onbekende koers een stip in plaats van een pijl.
- Nauwkeurigheid slechter dan 50 m: melding in de navigatiebalk "GPS onnauwkeurig (80 m)".

#### KAART-06 Offline kaart voor je gebied
**Als** schipper **wil ik** de kaart van mijn vaargebied vooraf downloaden **zodat** ik ook zonder bereik een kaart onder mijn route heb.
Prioriteit: Must · Omvang: L · Gratis voor de route-corridor, Plus voor hele regio's

Acceptatiecriteria:
- Download van de route-corridor (ONB-04) en, voor Plus, hele regio's (Groene Hart, Vecht en Loosdrecht, Friesland later) met grootte vooraf ("ongeveer 120 MB").
- Werkt met de tegelprovider uit TECH-01; licentie staat offline gebruik toe.
- Beheer in Aan boord: lijst, grootte, bijwerken, verwijderen.
- Bij voorkeur vectortegels (PMTiles) zodat een regio klein blijft en de kaart scherp is op elk zoomniveau.

---

### Epic NAV: navigatie

#### NAV-01 Rustige instructies: alleen wat ertoe doet
**Als** schipper **wil ik** alleen instructies krijgen op momenten dat ik iets moet doen **zodat** ik de app vertrouw en niet ga negeren.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Vaste bruggen met ruim voldoende hoogte (meer dan 1 m boven boot plus marge) zijn geen stap meer in de navigatie; ze blijven zichtbaar in de stappenlijst als grijze regel zonder nummer.
- Krappe vaste bruggen (minder dan 0,5 m speling) wel: "Let op, Kerkbrug 2,50 m. Je hebt 1 m ruimte."
- Bruggen met onbekende hoogte: één gecombineerde melding per cluster ("De komende 3 bruggen hebben een onbekende hoogte").
- Op Delft naar Loosdrecht daalt het aantal gesproken instructies met minstens de helft ten opzichte van nu; regressietest in `scripts/test_route.ts`.
- Volgorde van belang bij botsing binnen 200 m: sluis, beweegbare brug, afslag, vaste brug.

#### NAV-02 Automatisch herberekenen
**Als** schipper die een andere afslag neemt **wil ik** dat de app vanzelf een nieuwe route maakt **zodat** ik niet hoef te stoppen om op een knop te drukken.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Na 20 seconden meer dan 80 m van de route, of meteen als je een andere vaarweg op bent gevaren, herberekent de app vanaf de huidige positie naar de resterende tussenpunten.
- Melding "Nieuwe route berekend, 4 min langer" en spraak.
- Maximaal één herberekening per 30 seconden; als de nieuwe route terug naar de oude leidt, blijft de oude.
- Knop "Herbereken" blijft voor handmatig gebruik.
- Tussenpunten die je al gepasseerd bent, worden overgeslagen.

#### NAV-03 Scherm aan en haptiek
**Als** schipper **wil ik** dat het scherm aan blijft tijdens navigatie en dat mijn telefoon trilt bij een nieuwe instructie **zodat** ik niet steeds hoef te ontgrendelen.
Prioriteit: Must · Omvang: S · Gratis

Acceptatiecriteria:
- Screen Wake Lock bij Start navigatie, opnieuw aanvragen bij `visibilitychange`, loslaten bij Stop (styleguide 8). In de app: `expo-keep-awake` (staat er al).
- Trilling van 30 ms bij een nieuwe instructie en bij de naderingskaart; uit te zetten in Instellingen (styleguide 10).
- Waar Wake Lock niet werkt: eenmalige tip "Zet automatische schermvergrendeling uit tijdens het varen".

#### NAV-04 Aankomst en samenvatting
**Als** schipper **wil ik** bij aankomst een duidelijke afsluiting zien **zodat** ik weet dat ik er ben en mijn tocht kan bewaren.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Binnen 30 m van de bestemming: groene instructiebalk "Je bent er" en spraak.
- Daarna een kaart met: afgelegde afstand, tijd, gemiddelde snelheid, gepasseerde bruggen en sluizen, en knoppen "Bekijk in logboek", "Aanleggen in de buurt" (lijst uit Aanleggen) en "Klaar".
- Bij een stuk over land: "Nog 600 m lopen naar Leiden centrum" met de loop-link.
- Navigatie stopt pas na "Klaar" of na 5 minuten stilliggen bij de bestemming; het logboekitem wordt dan opgeslagen.

#### NAV-05 Grote, rustige navigatieweergave
**Als** schipper aan het roer **wil ik** de instructie en de afstand groot en met hoog contrast zien **zodat** ik het in de zon en met een snelle blik kan lezen.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Instructie in Display (28 px), afstand in Kop 1, conform styleguide 8; minimaal 56 × 56 px tikoppervlak.
- Voortgangsbalk naar de volgende instructie in de instructiebalk.
- Kaart zoomt in tot zoom 17 op 150 m voor een afslag en terug naar 15 daarna.
- Knop koers-omhoog of noord-omhoog (styleguide 7), keuze wordt bewaard.
- Nachtmodus automatisch tussen zonsondergang en zonsopkomst (DS-05).
- Getallen in de onderste balk wijzigen niet van breedte (tabular figures), zodat ze niet verspringen.

#### NAV-06 Snelheidswaarschuwing
**Als** schipper **wil ik** weten wat de maximumsnelheid is en een waarschuwing krijgen als ik te hard vaar **zodat** ik geen boete krijg en geen hinderlijke golfslag maak.
Prioriteit: Should · Omvang: S · Gratis

Acceptatiecriteria:
- In de navigatiebalk een rond bord met de maximumsnelheid als die bekend is (`WayInfo.s`, of 6 km/u in grachten volgens `classifyWay`).
- Meer dan 10 procent te hard gedurende 15 seconden: bord wordt rood en de app zegt één keer "Maximaal 6 kilometer per uur".
- Uit te zetten in Instellingen.

#### NAV-07 Naderingskaart verder uitgewerkt
**Als** schipper die een sluis of brug nadert **wil ik** precies weten wat ik moet doen en of het object bediend wordt als ik aankom **zodat** ik op tijd kan aanmelden en niet voor een dichte brug lig.
Prioriteit: Must · Omvang: M · Gratis (real-time brugstatus Plus, SPEC 4.3) · Raakt SPEC 4.1, 4.3

Acceptatiecriteria:
- Bovenaan de status voor jouw aankomsttijd: "Bediend tot 18:00, je bent er om 16:40" (groen) of "Gesloten tot 9:00, je bent er om 8:10" (rood, met de dichtstbijzijnde wachtplaats of haven).
- Knoppen "Bel brugwachter" en "Marifoon kanaal 20" (kopieert of toont groot).
- Korte checklist met afvinken; vinkjes worden bewaard voor dit object tijdens deze tocht.
- Bij zelfbediening: uitleg hoe de bediening werkt (knop, pas, app).
- Na het passeren verdwijnt de kaart vanzelf; terug te halen via een klein icoon in de navigatiebalk.

#### NAV-08 Navigatie overleeft een herstart
**Als** schipper **wil ik** na het per ongeluk sluiten van de app verder kunnen waar ik was **zodat** mijn route en logboek niet verloren gaan.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Actieve route, tussenpunten, spoor, gesproken meldingen en starttijd worden elke 15 seconden en bij `visibilitychange` bewaard.
- Bij openen binnen 12 uur: "Verder navigeren naar Leiden centrum?" met Ja en Nee; Nee slaat het spoor tot dan toe op in het logboek.
- Getest door de pagina tijdens navigatie te herladen in Playwright.

#### NAV-09 Achtergrondnavigatie (app)
**Als** schipper **wil ik** met het scherm uit gesproken instructies blijven horen **zodat** ik batterij spaar op een lange tocht.
Prioriteit: Should · Omvang: L · Gratis · Alleen in de Expo-app (een PWA kan dit niet betrouwbaar)

Acceptatiecriteria:
- `expo-location` met achtergrondtaak (`expo-task-manager`). Toestemming "tijdens gebruik" volstaat als de navigatie in de voorgrond start: iOS met `UIBackgroundModes` `location` en `audio`, Android met een foreground service (`FOREGROUND_SERVICE_LOCATION`). Zo is "altijd" (APPSTORE.md stap 6) en de Play-declaratie voor achtergrondlocatie niet nodig; pas APPSTORE.md daarop aan.
- Spraak met audio ducking, zodat muziek zachter gaat in plaats van te stoppen.
- iOS: blauwe statusbalk zichtbaar; Android: vaste melding "Vaarmaat navigeert naar Leiden" met Stop.
- Batterijtest: 4 uur navigatie met scherm uit kost minder dan 25 procent op een telefoon uit 2022.

---

### Epic DATA: data en betrouwbaarheid

#### DATA-01 Doorvaarthoogtes uit officiële bron
**Als** schipper **wil ik** dat zoveel mogelijk bruggen een betrouwbare doorvaarthoogte hebben **zodat** ik kan plannen zonder te gokken.
Prioriteit: Must · Omvang: L · Gratis · Raakt SPEC 4.1, 4.4

Acceptatiecriteria:
- Script `scripts/match_rws.py` haalt de objectgegevens van Rijkswaterstaat (Vaarweginformatie, open data) en waar beschikbaar provinciale en gemeentelijke brugregisters op, en koppelt ze op naam en positie (binnen 100 m) aan bruggen in de graaf.
- Resultaat in `public/data/overrides.json` (nooit in `graph.json`), met per brug `h`, `src` (`osm`, `rws`, `provincie`, `gebruiker`) en `checked` (datum).
- Rapport van niet-gekoppelde objecten voor handmatige controle.
- Doel na deze story: op de testroutes uit `scripts/test_route.ts` heeft minstens 70 procent van de bruggen een hoogte (nu op Kaag naar Leiden 2 van 12).
- `npm run test:routes` blijft groen.

#### DATA-02 Bedieningstijden en stremmingen
Zie SPEC 4.1 en 4.2. Aanvulling: doel voor de eerste oplevering is 80 procent van de beweegbare bruggen en sluizen op de testroutes met tijden (nu 13 van 583 bruggen). De UI-kant staat in NAV-07 en KAART-03. Prioriteit: Must · Omvang: XL.

#### DATA-03 "Klopt dit niet?" voor bruggen, sluizen en havens
**Als** schipper die ter plaatse iets anders ziet **wil ik** dat met twee tikken kunnen melden **zodat** de volgende schipper betere informatie heeft.
Prioriteit: Must · Omvang: M · Gratis · Raakt SPEC 4.9

Acceptatiecriteria:
- Knop in elk detailpaneel (brug, sluis, haven) en na het passeren van een brug met onbekende hoogte: "Wat was de hoogte op het bord?" met een getalveld.
- Formulier: soort (hoogte, bediening, naam, bestaat niet, anders), waarde, toelichting, optioneel een foto van het hoogtebord; positie en datum automatisch.
- Werkt als gast (opslag in `reports` met RLS, SPEC 4.9) en offline (wachtrij, verstuurd zodra er verbinding is).
- Bevestiging "Dank je. We controleren je melding." en in het profiel een teller "Jouw bijdragen".
- Beheerpagina voor meldingen met knop "Overnemen in overrides".

#### DATA-04 Herkomst en ouderdom zichtbaar
**Als** schipper **wil ik** zien waar een gegeven vandaan komt en hoe oud het is **zodat** ik weet hoeveel ik erop kan bouwen.
Prioriteit: Should · Omvang: S · Gratis

Acceptatiecriteria:
- Bij hoogte, bedieningstijden, liggeld en telefoon een klein label: "Rijkswaterstaat, maart 2026", "OpenStreetMap", "gemeld door 3 schippers, juli 2026".
- Ouder dan 2 jaar of alleen van één melding: grijs met "niet gecontroleerd".
- In de app-info: datum van de laatste data-update.

#### DATA-05 Havengegevens aanvullen
**Als** schipper die een overnachting zoekt **wil ik** van elke haven naam, liggeld, plaatsen, stroom, water, sanitair en contact zien **zodat** ik kan kiezen zonder te bellen.
Prioriteit: Should · Omvang: L · Gratis

Acceptatiecriteria:
- Naamloze havens en aanlegplaatsen krijgen een beschrijvende naam uit de omgeving ("Aanlegplaats Rijpwetering, Ade") in `build_pois.py`.
- Bronnen naast OSM: gemeentelijke passantenplaatsen (open data), de lijst van havens die meedoen aan reserveren (SPEC 7.3), en havenmeesters zelf via een eenvoudig formulier (HAVEN-01).
- Doel: 90 procent van de overnachtingsplekken heeft een naam, 50 procent van de jachthavens een telefoonnummer en liggeld.
- Detailpaneel toont voorzieningen als iconenrij (stroom, water, douche, wc, wifi, vuilwater, tanken) in plaats van een tabel.

#### DATA-06 Automatische data-update
**Als** beheerder **wil ik** dat vaarwegen en havens maandelijks automatisch ververst worden **zodat** de app actueel blijft zonder handwerk.
Prioriteit: Should · Omvang: M

Acceptatiecriteria:
- GitHub Action, maandelijks: `fetch_osm.mjs`, `build_graph.py`, `refine_graph.py`, `fetch_pois.mjs`, `build_pois.py`, overrides toepassen, `test:routes`.
- Maakt een pull request met een samenvatting: aantal bruggen, sluizen, havens, verschil met vorige keer, en de uitkomst van de routetest.
- Faalt als een bekende route meer dan 10 procent verandert of verdwijnt.
- `graph.json` krijgt een versie en de app toont "Vaarwegen bijgewerkt op 1 november 2026".

---

### Epic TOCHT: tochten, logboek en delen

#### TOCHT-01 Tochten als volwaardige plannen
**Als** schipper die een vakantie plant (Kees) **wil ik** een tocht met datum, dagindeling, notities en gekozen overnachtingen bewaren **zodat** ik hem later precies zo terugvind en kan volgen.
Prioriteit: Must · Omvang: L · Dagindeling met overnachtingen is Plus (SPEC 6.3)

Acceptatiecriteria:
- Tocht bewaart: tussenpunten, gekozen alternatief, boot, vertrekdatum en tijd per dag, vaaruren per dag, gekozen overnachting per dag (ook als die afwijkt van het voorstel), notities.
- Tochtenlijst toont per tocht een kaartje van de route, datum, aantal dagen, afstand en het weeradvies als de datum binnen 7 dagen valt.
- Openen toont de dagindeling met per dag een knop "Start dag 2".
- Bewerken: naam, datum, overnachting per dag wisselen uit de alternatieven.
- Lege staat: illustratie, één zin en de knop "Plan je eerste tocht".

#### TOCHT-02 Logboek met details en bewerken
**Als** schipper **wil ik** mijn gevaren tochten met kaart, statistieken, notities en foto's terugzien **zodat** ik een echt logboek heb en mooie herinneringen.
Prioriteit: Should · Omvang: M · GPX-export is Plus (SPEC 6.3)

Acceptatiecriteria:
- Detailscherm per tocht: kaart met spoor, afstand, vaartijd, stiltijd, gemiddelde en topsnelheid, gepasseerde bruggen en sluizen.
- Notitie en tot 5 foto's per tocht (lokaal opgeslagen; met sync via Supabase Storage).
- Naam aanpasbaar; van en naar worden voorgesteld uit route of dichtstbijzijnde plek.
- Seizoensoverzicht: totaal kilometers, uren, aantal tochten, meest bezochte havens.
- Exporteren als GPX en als PDF voor wie een papieren logboek bijhoudt.

#### TOCHT-03 Route en tocht delen
Zie SPEC 8.1 en BACKEND.md 7. Aanvulling voor het ontwerp:
- Deelknop in de routesheet en bij elke tocht; het deelmenu van het toestel (Web Share API, in de app `expo-sharing`).
- De gedeelde pagina `/t/<id>` toont zonder account een kaart met de route, afstand, duur en de knop "Open in Vaarmaat"; met mooie voorvertoning (Open Graph-afbeelding van de route) in WhatsApp.
- Delen werkt ook zonder account voor de ontvanger; maken van een link vraagt geen account als hij alleen tussenpunten bevat (dan in de URL zelf gecodeerd).
- Prioriteit: Should · Omvang: M.

#### TOCHT-04 Samen varen: positie delen met de wal
**Als** schipper **wil ik** mijn live positie en verwachte aankomst delen met iemand aan wal **zodat** die weet waar we zijn en wanneer we aankomen.
Prioriteit: Could · Omvang: L · Plus

Acceptatiecriteria:
- "Deel mijn tocht" tijdens navigatie maakt een link die 12 uur geldig is en elke minuut de positie en aankomsttijd toont.
- Stopt automatisch bij Stop of aankomst; de schipper kan altijd intrekken.
- Expliciete toestemming en uitleg welke gegevens gedeeld worden.

---

### Epic LEER: leren

#### LEER-01 Lessen met beeld
**Als** beginner (Sanne) **wil ik** de borden, betonning, bruglichten en een sluis in beeld zien **zodat** ik ze op het water herken.
Prioriteit: Must · Omvang: L · Basis gratis, verdieping Plus

Acceptatiecriteria:
- De les Borden en betonning toont elk bord als SVG (verkeerstekens uit het Binnenvaartpolitiereglement) en elke ton als tekening.
- De les Sluis heeft een stapsgewijze tekening (invaren, afmeren, schutten, uitvaren), met tikbare stappen.
- Seinen blijven als nu (die zijn al goed), plus een animatie van een brug die opengaat, uit bij `prefers-reduced-motion`.
- Afbeeldingen zijn offline beschikbaar en hebben een beschrijving voor schermlezers.

#### LEER-02 Module "Eerste keer varen" voor huurders
**Als** huurder zonder ervaring **wil ik** in 5 minuten het belangrijkste weten **zodat** ik vandaag veilig en ontspannen vaar.
Prioriteit: Must · Omvang: M · Gratis

Acceptatiecriteria:
- Vijf kaarten om door te vegen: stuurboord en bakboord, voorrang in het kort, onder een brug door, aanleggen, wat te doen bij pech.
- Eindigt met de vertrekchecklist en "Ik ben klaar om te varen".
- Getoond na de onboarding als iemand "huurboot" koos (ONB-01) en altijd bovenaan Leren.

#### LEER-03 Oefenexamen Klein Vaarbewijs
Zie SPEC 6.4. Aanvulling voor het ontwerp: start met een overzicht per categorie (voortgangsring), examenmodus met timer en vlaggen om vragen later te bekijken, na afloop een uitslag met per fout de uitleg en een link naar de les. Nu zijn er 19 quizvragen in totaal; doel 150 of meer. Prioriteit: Should · Omvang: XL · Plus.

#### LEER-04 Leren op het juiste moment
**Als** schipper **wil ik** na het passeren van mijn eerste sluis een korte vraag of tip krijgen **zodat** ik leer van wat ik net deed.
Prioriteit: Could · Omvang: S · Gratis

Acceptatiecriteria:
- Na aankomst (NAV-04): "Je passeerde vandaag 2 sluizen. Test jezelf in 3 vragen?" met een link naar de quiz van die les.
- Maximaal één keer per dag, uit te zetten.

---

### Epic ACC: account, synchronisatie en Vaarmaat Plus

#### ACC-01 Inloggen met e-mail, Apple en Google
**Als** gebruiker **wil ik** inloggen zonder wachtwoord **zodat** mijn tochten, logboek en boot op al mijn apparaten staan.
Prioriteit: Must (fase 2) · Omvang: M · Gratis account · Raakt SPEC 6.1, LOVABLE.md 4.1

Acceptatiecriteria:
- Scherm Account onder Aan boord: e-mail met inloglink, en (in de app verplicht naast elkaar) Inloggen met Apple en met Google.
- Na inloggen: `uploadLocal` en `pullRemote`, met de melding "Je tochten en logboek staan nu in je account".
- Status zichtbaar: ingelogd als, laatste synchronisatie, knop Uitloggen.
- Zonder Supabase-configuratie is het scherm verborgen en blijft alles als gast werken.

#### ACC-02 Synchronisatie met offline wachtrij
Zie BACKEND.md 3. Acceptatie aanvullend: wijzigingen offline gemaakt worden binnen 30 seconden na herstel van de verbinding verstuurd; een conflict (dezelfde tocht op twee toestellen gewijzigd) bewaart beide versies met de melding "Twee versies van Vakantie Vecht, kies welke je houdt". Prioriteit: Must · Omvang: L.

#### ACC-03 Plus-pagina en proefperiode
**Als** gebruiker **wil ik** duidelijk zien wat Plus me oplevert en het zonder risico proberen **zodat** ik bewust kies.
Prioriteit: Must (fase 2) · Omvang: M · Raakt SPEC 6.2, 6.3

Ontwerp:
- Eén pagina "Vaarmaat Plus" met drie blokken: Plannen (dagindeling, overnachten, tanken), Leren (alle modules, oefenexamen, certificaat), Live (brugstatus, meldingen, sync). Per blok een schermafbeelding.
- Prijzen naast elkaar, seizoen gemarkeerd als "Meest gekozen", jaar met "bespaar 58 procent ten opzichte van maandelijks".
- Vermelding "Veiligheid is altijd gratis: noodscherm, bruglichten, navigatie en spraak".

Acceptatiecriteria:
- `PlusGate` wordt op de plekken uit SPEC 6.3 gebruikt; de knop "Wat zit er in Plus?" opent deze pagina.
- Proef 14 dagen zonder betaalgegevens; drie dagen voor het einde een melding.
- Checkout-tekst volgens SPEC 6.2 (btw, afzien van herroepingsrecht).
- Event `plus_gate_shown` en `plus_started` worden verstuurd (TECH-06).

#### ACC-04 Abonnement beheren en opzeggen
**Als** abonnee **wil ik** in de app zien wat ik heb en het met twee tikken kunnen opzeggen **zodat** ik me nooit vastgezet voel.
Prioriteit: Must (fase 2) · Omvang: S

Acceptatiecriteria:
- Account toont plan, volgende betaaldatum of einddatum, en "Beheer abonnement" (Stripe Customer Portal op web, winkelabonnementen in de app).
- Opzeggen kan zonder te bellen of te mailen (wettelijk verplicht in Nederland voor online afgesloten abonnementen).
- Na opzeggen blijft Plus actief tot het einde van de periode; daarna blijven eigen gegevens bewaard en zichtbaar, alleen Plus-functies gaan dicht.

#### ACC-05 Account en gegevens verwijderen of downloaden
Zie JUR-03.

#### ACC-06 Instellingen synchroniseren
Bootprofielen, instellingen, favorieten, thuishaven en lesvoortgang gaan mee in de sync (de code in `src/backend/sync.ts` doet een deel). Prioriteit: Should · Omvang: S.

#### ACC-07 Meldingen
Zie SPEC 8.2. Aanvulling: begin met twee meldingen die direct waarde hebben: "Morgen windkracht 6 op je geplande tocht" en "Stremming op je route van zaterdag". Toestemming pas vragen als iemand een tocht met datum bewaart, nooit bij de eerste start. Prioriteit: Should · Omvang: L · Plus.

---

### Epic DS: design system, toegankelijkheid en desktop

#### DS-01 Eigen iconenset en beeldmerk
**Als** gebruiker **wil ik** een rustige, consistente iconenset **zodat** de app er overal hetzelfde en verzorgd uitziet.
Prioriteit: Must · Omvang: L

Acceptatiecriteria:
- De set uit styleguide 6 (24 px, 2 px lijn, ronde uiteinden) als SVG-componenten in `src/icons/` en dezelfde set voor de app via `react-native-svg`.
- Alle emoji in tabbalk, stappen, kaartmarkers, knoppen, POI-soorten en lessen vervangen; emoji en eigen iconen nooit gemengd.
- Het beeldmerk uit de styleguide (kompasroos met stuurboord- en bakboordboog) in de bovenbalk in plaats van ⚓.
- Iconen hebben `aria-hidden` als er tekst naast staat, anders een `aria-label`.

#### DS-02 Componentenbibliotheek en tokens
**Als** ontwikkelaar **wil ik** vaste componenten (knop, chip, veld, sheet, kaart, melding, dialoog, toast, lege staat) met tokens **zodat** nieuwe schermen vanzelf consistent zijn.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Componenten in `src/components/ui/` met dezelfde namen als `mobile/src/components/ui.tsx`.
- Geen hardcoded kleuren in componenten; nu staan er onder meer `#0a66ff`, `#8a2be2`, `#ff5a1f` en `#fff` in `MapView.tsx`, `LessonsView.tsx` en `index.css`. Alles via tokens.
- Een pagina `/ontwerp` (alleen in development) die alle componenten in alle staten toont, en waarvan Playwright schermafbeeldingen maakt.

#### DS-03 Toegankelijkheid volgens WCAG 2.2 AA
**Als** gebruiker met een beperking of met natte handen in de zon **wil ik** dat alles groot genoeg, goed leesbaar en met toetsenbord of schermlezer te bedienen is.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Alle knoppen minimaal 44 × 44 px tikoppervlak (sluitknoppen nu 30 px), in navigatie 56 px.
- Focusring 2 px `--blue` met `:focus-visible` op alle interactieve elementen.
- Elke knop met alleen een icoon heeft een `aria-label` (nu 8 `aria`-attributen in alle componenten samen).
- Sheets en dialogen houden de focus vast en geven hem terug bij sluiten; Escape sluit.
- `prefers-reduced-motion` schakelt animaties uit; systeemlettergrootte tot 130 procent zonder afgekapte tekst.
- Automatische controle met axe in Playwright op de belangrijkste schermen, in CI (TECH-03).

#### DS-04 Desktop en tablet als volwaardige layout
**Als** schipper die thuis een vakantie plant **wil ik** op een groot scherm comfortabel plannen **zodat** ik de kaart en alle details tegelijk zie.
Prioriteit: Should · Omvang: L

Ontwerp:
- Vanaf 900 px: vaste zijbalk van 400 px links met bovenaan de zoekvelden en daaronder de routesheet (geen zwevende kaarten), en de navigatie (Kaart, Tochten, Leren, Aan boord) als iconenrail links of tabs bovenin, niet als balk over de volle breedte onderaan.
- Tochten, Leren en Aan boord openen in dezelfde zijbalk; de kaart blijft rechts zichtbaar en toont de geselecteerde tocht.
- Sneltoetsen: `/` naar zoeken, `Escape` sluit, `+` en `-` zoomen.

Acceptatiecriteria:
- Op 1280 × 800 en 1920 × 1080 geen overlappende panelen, geen tabbalk onderaan.
- Tablet in liggende stand gebruikt de desktoplayout, staand de telefoonlayout.

#### DS-05 Donkere modus en nachtnavigatie
**Als** schipper die in de schemering vaart **wil ik** een donker scherm **zodat** ik niet verblind word en mijn nachtzicht behoud.
Prioriteit: Should · Omvang: M

Acceptatiecriteria:
- Tokens voor donker uit styleguide 2; kaart met `brightness(0.85)`.
- Instelling: Licht, Donker, Automatisch (systeem) en, tijdens navigatie, automatisch donker tussen zonsondergang en zonsopkomst.
- Contrast blijft minimaal 4,5:1.

#### DS-06 Microcopy en toon nalopen
**Als** gebruiker **wil ik** overal dezelfde rustige, duidelijke toon **zodat** de app voelt als de ervaren maat naast me.
Prioriteit: Should · Omvang: S

Acceptatiecriteria:
- Alle teksten naar `src/i18n/nl.ts` (SPEC 8.5), zodat ze op één plek te lezen en te verbeteren zijn.
- Controle op: geen streepjes als leesteken, geen Engelse woorden, werkwoord vooraan in knoppen ("Wis" wordt "Verwijderen", "ok" wordt "Sluiten"), knoppen en hun uitleg gelijk ("Bewaren als tocht" in de uitleg, "Bewaren" op de knop).
- Script dat de teksten scant op en-dash, em-dash en een lijst verboden Engelse woorden, in CI.

---

### Epic TECH: techniek, kwaliteit en beheer

#### TECH-01 Eigen tegelprovider
**Als** aanbieder **wil ik** kaarttegels van een provider met een commerciële licentie **zodat** de kaart blijft werken als er veel gebruikers zijn.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Keuze tussen MapTiler, Stadia of eigen vectortegels (PMTiles op Netlify of R2); de afweging staat in een korte beslisnotitie.
- Sleutel in een `VITE_`-variabele met domeinbeperking; web en app gebruiken dezelfde stijl.
- Luchtfoto via een bron met passende licentie (bijvoorbeeld PDOK Luchtfoto).
- Bronvermelding volgens de licenties op de kaart en in Over.

#### TECH-02 Foutmonitoring en error boundary
**Als** ontwikkelaar **wil ik** fouten van gebruikers automatisch binnenkrijgen **zodat** ik problemen oplos voordat iemand afhaakt.
Prioriteit: Must · Omvang: S

Acceptatiecriteria:
- Error boundary rond de app met een nette pagina: "Er ging iets mis. Je route en logboek zijn bewaard." met de knop "Opnieuw laden"; tijdens navigatie wordt eerst de navigatiestatus bewaard (NAV-08).
- Sentry (EU-regio) of een vergelijkbare dienst in web en app (`sentry-expo`), zonder locatie in de foutmelding.
- Bronbestanden (source maps) geüpload bij elke build; versie en commit gekoppeld.

#### TECH-03 Tests en CI
**Als** ontwikkelaar **wil ik** dat elke wijziging automatisch getest wordt **zodat** routering, navigatie en schermen niet ongemerkt breken.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Unit-tests (Vitest) voor `geo.ts` (opmaak), `navigation.ts` (positie op route, stilliggen), `trip.ts` (dagindeling, tussenpunten), `weather.ts` (`assess`), `routing.ts` (bestaande routetest plus een test op aantallen instructies, NAV-01).
- End-to-end in Playwright: plannen, navigeren met een nagespeeld GPS-spoor (Kaag naar Leiden, versneld), aankomst, logboek. Telefoon en desktop.
- Visuele regressie: schermafbeeldingen van `scripts/screenshot.mjs` vergeleken met een basis; verschil boven drempel faalt.
- Axe-controle (DS-03) en `cd mobile && npm run typecheck` in CI.
- CI blijft onder 10 minuten.

#### TECH-04 Routering in een Web Worker
Zie SPEC 4.8. Aanvulling: begin met de huidige regio, zodat de hoofdthread vrij is bij lange routes en de kaart blijft reageren; spinner na 300 ms (styleguide 10). In de app via een aparte JS-thread of door de berekening in stukken te knippen. Prioriteit: Should · Omvang: M.

#### TECH-05 Navigatielogica delen tussen web en app
**Als** ontwikkelaar **wil ik** de navigatielogica (positie, spraakmomenten, nadering, aankomst, spoor) één keer schrijven **zodat** web en app zich hetzelfde gedragen en fixes maar op één plek hoeven.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Nieuwe module `src/navEngine.ts` zonder browser-API's: neemt een positie en tijd, geeft een `NavState` plus een lijst gebeurtenissen (`speak`, `approach`, `arrive`, `offRoute`, `reroute`). Daarnaast `src/planner.ts` (tussenpunten, tochten openen en bewaren, route naar haven) en `src/logbook.ts` (logboekitem opbouwen, GPX).
- `STEP_ICONS`, het type `Approach` en de spraakdrempels staan één keer in `src/`.
- `App.tsx` en `mobile/src/App.tsx` worden dunne lagen die gebeurtenissen omzetten naar spraak, trilling en UI; samen minstens 400 regels korter.
- Unit-tests op de engine met nagespeelde sporen (TECH-03).

#### TECH-06 Analytics aansluiten en een dashboard
**Als** productteam **wil ik** weten hoe de app gebruikt wordt **zodat** we beslissingen op cijfers nemen.
Prioriteit: Should · Omvang: S · Raakt SPEC 8.3

Acceptatiecriteria:
- `track()` wordt aangeroepen voor alle events uit SPEC 8.3 (nu nergens), plus `onboarding_done`, `route_failed` (met reden), `reroute`, `report_sent`, `emergency_opened` (alleen het aantal).
- Geen locatie, geen e-mail, geen vrije tekst in events.
- Een dashboard met de meetpunten uit hoofdstuk 7.

#### TECH-07 Updates zonder verrassingen
**Als** gebruiker **wil ik** dat de app nooit tijdens het varen ververst **zodat** ik mijn navigatie niet kwijtraak.
Prioriteit: Should · Omvang: S

Acceptatiecriteria:
- Service worker met `registerType: 'prompt'`: melding "Nieuwe versie beschikbaar" met "Nu bijwerken", nooit tijdens navigatie.
- Versienummer en datum van de data in Over.
- In de app: `expo-updates` voor kleine updates, met dezelfde regel.

#### TECH-08 Prestaties en batterij
**Als** schipper **wil ik** dat de app snel opent en zuinig is **zodat** mijn telefoon de dag doorkomt.
Prioriteit: Should · Omvang: M

Acceptatiecriteria:
- Eerste keer openen tot bruikbare kaart onder 3 seconden op 4G op een middenklasse telefoon; daarna onder 1 seconde.
- Kaartmarkers alleen opnieuw tekenen als de zichtbare set verandert; navigatie-updates niet vaker dan eens per seconde naar React.
- Batterijmeting in de app tijdens een testvaart van een uur (scherm aan) met doel onder 15 procent.

---

### Epic JUR: juridisch en privacy

#### JUR-01 Privacyverklaring, voorwaarden en colofon
**Als** gebruiker **wil ik** kunnen lezen wat er met mijn gegevens gebeurt en wie de app maakt **zodat** ik de app kan vertrouwen.
Prioriteit: Must · Omvang: S (tekst door een jurist laten controleren)

Acceptatiecriteria:
- Pagina's Privacy, Voorwaarden en Over (met KvK, adres, contact) op een openbare URL en in de app onder Aan boord.
- Privacy beschrijft: locatie (alleen op het toestel tenzij je logboek synchroniseert of positie deelt), account, betalingen, analytics (zonder cookies), foutmonitoring, bewaartermijnen, verwerkers (Supabase EU, Stripe, Sentry).
- Bronvermeldingen volledig (OSM, OpenSeaMap, tegelprovider, weerbron, RWS, PDOK).

#### JUR-02 Toestemming voor locatie met uitleg vooraf
**Als** gebruiker **wil ik** eerst begrijpen waarom de app mijn locatie wil **zodat** ik met vertrouwen toestemming geef.
Prioriteit: Must · Omvang: S

Acceptatiecriteria:
- Voor de systeemvraag een eigen scherm: "Vaarmaat gebruikt je locatie om je op het water te navigeren. Je positie blijft op je telefoon."
- Bij weigeren: uitleg hoe je het later aanzet en de app blijft werken met kiezen op de kaart.
- Nooit bij de eerste start vragen, pas bij "Mijn locatie" of Start navigatie.

#### JUR-03 Gegevens downloaden en account verwijderen
**Als** gebruiker met een account **wil ik** mijn gegevens kunnen downloaden en mijn account kunnen verwijderen **zodat** ik baas blijf over mijn data (AVG, en verplicht voor de App Store).
Prioriteit: Must (zodra accounts live gaan) · Omvang: M

Acceptatiecriteria:
- Knop "Download mijn gegevens": ZIP met tochten, logboek (GPX en JSON), profiel en meldingen.
- Knop "Verwijder mijn account": bevestiging met het woord VERWIJDEREN, waarschuwing over een lopend abonnement, daarna verwijdert een Edge Function alle rijen en de gebruiker in `auth.users` binnen 30 dagen (direct uit de app zichtbaar).
- Lokaal blijven de gegevens als gast staan, tenzij je kiest voor "Ook van dit toestel wissen".

---

### Epic APP: mobiele app winkelklaar

De stories hieronder komen uit de review van `mobile/` (zie 3.7) en `docs/APPSTORE.md`. Achtergrondnavigatie staat in NAV-09, de gedeelde navigatielogica in TECH-05.

#### APP-01 Kaart productieklaar in de app
**Als** app-gebruiker **wil ik** altijd een kaart met de juiste bronvermelding **zodat** de app niet leeg is en voldoet aan de licenties.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Tegels van de provider uit TECH-01, met een eigen User-Agent; op Android een terugval als tegels niet laden (melding "Kaart laadt niet, routes werken gewoon").
- `mapPadding` en `legalLabelInsets` zodat de bronvermelding en het Google- of Apple-label altijd boven tabbalk en sheet zichtbaar zijn.
- Tegelcache (`tileCachePath`) voor de route-corridor, zoals ONB-04 en KAART-06.
- Productiebuild faalt als `GOOGLE_MAPS_ANDROID_API_KEY` ontbreekt; de sleutel is beperkt tot package `nl.vaarmaat.app` en de SHA-1 van de build.

#### APP-02 Crashrapportage, error boundary en updates op afstand
**Als** ontwikkelaar **wil ik** crashes zien en kleine fixes zonder winkelrelease uitrollen **zodat** problemen op het water snel opgelost zijn.
Prioriteit: Must · Omvang: S

Acceptatiecriteria:
- Error boundary rond `<Main/>` met dezelfde tekst als op het web (TECH-02); Sentry voor React Native (EU-regio).
- `expo-updates` met `runtimeVersion` en kanalen (`preview`, `production`) in `eas.json`; updates worden nooit tijdens navigatie toegepast.
- Versie en buildnummer zichtbaar in Over; buildnummer loopt automatisch op in EAS.

#### APP-03 Toestemmingen, terugknop en levenscyclus
**Als** app-gebruiker **wil ik** dat de app zich gedraagt zoals ik van mijn telefoon verwacht **zodat** ik nergens vastloop.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Uitlegscherm voor de locatievraag (JUR-02); bij weigering een knop "Open instellingen" (`Linking.openSettings`); benaderde locatie (Android 12 en hoger, iOS zonder "Precieze locatie") wordt herkend met de melding "Zet precieze locatie aan voor navigatie".
- GPS stopt na Stop en als de app naar de achtergrond gaat zonder actieve navigatie (`AppState`).
- Android-terugknop tijdens navigatie vraagt "Navigatie stoppen?"; buiten navigatie sluit hij eerst open sheets.
- Velden in sheets schuiven boven het toetsenbord (`KeyboardAvoidingView`), numerieke velden hebben een knop Gereed op iOS.
- Profielwijzigingen herberekenen de route pas na 600 ms stilte of bij sluiten van het paneel.

#### APP-04 Spraak en geluid
**Als** schipper **wil ik** instructies horen ook als mijn telefoon op stil staat, zonder dat mijn muziek stopt **zodat** ik ze nooit mis.
Prioriteit: Must · Omvang: S

Acceptatiecriteria:
- Audiosessie zo ingesteld dat spraak klinkt met de stilschakelaar aan en andere audio tijdelijk zachter gaat (ducking).
- Controle op een Nederlandse stem; zonder stem is de spraakschakelaar uit met uitleg.
- Meldingen in een wachtrij met prioriteit: een afslag breekt een naderingsmelding niet af, alleen "van de route af" en noodmeldingen mogen onderbreken.
- Spraakmomenten volgens styleguide 8 (600 m, 1 km voor brug en sluis, 150 m, bij de afslag), vastgelegd in één gedeelde constante in `src/`.

#### APP-05 Klaar voor App Store en Google Play
**Als** aanbieder **wil ik** dat de app in één keer door de review komt **zodat** de lancering niet vertraagt.
Prioriteit: Must · Omvang: M

Acceptatiecriteria:
- Icoon 1024 × 1024 zonder alfakanaal, adaptief icoon voor Android, splashscreen in Diepblauw met beeldmerk.
- `locales` en `CFBundleDevelopmentRegion` op Nederlands; winkelteksten in het Nederlands, Engels als tweede taal.
- Privacy manifest (iOS) en Data safety (Google Play) ingevuld volgens JUR-01; link naar privacyverklaring in de app.
- Keuze iPad: `supportsTablet: false` tot DS-04 klaar is, of een tabletlayout plus iPad-screenshots.
- Reviewnotities: app werkt zonder account, demoroute Kaag naar Leiden, testaccount met Plus. Buiten het vaargebied toont de app "Vaarmaat werkt nu in het Groene Hart en de Hollandse Plassen" in plaats van een lege route.
- `submit.production` in `eas.json` ingevuld.

#### APP-06 Prestaties in de app
**Als** app-gebruiker **wil ik** een vloeiende kaart tijdens navigatie **zodat** de app niet hapert en mijn batterij spaart.
Prioriteit: Should · Omvang: M

Acceptatiecriteria:
- Stabiele handlers (`useCallback`) zodat gememoïseerde POI-markers niet opnieuw renderen bij een GPS-fix; polylines alleen opnieuw opbouwen als de route verandert.
- Bootmarker met `tracksViewChanges={false}` en de `rotation`-prop.
- Graaf als binair bestand met typed arrays in plaats van JSON (ook kleiner voor updates op afstand), gedeeld formaat met de Web Worker uit TECH-04.
- Meting: bij navigatie met 600 zichtbare markers blijft de kaart boven 50 beelden per seconde op een middenklasse Android.

#### APP-07 Typografie en schaal volgens de styleguide
**Als** app-gebruiker **wil ik** dezelfde letter en maten als op het web, ook met grotere systeemletters **zodat** alles leesbaar blijft.
Prioriteit: Should · Omvang: S

Acceptatiecriteria:
- Outfit geladen via `expo-font`, met systeemletter als terugval.
- Navigatiegetallen minstens 20 px, instructie 28 px (styleguide 8).
- Systeemlettergrootte tot 130 procent getest; `maxFontSizeMultiplier` waar een vaste hoogte nodig is (tabbalk), verder geen vaste hoogtes rond tekst.
- Naderingskaart positioneert zich onder de gemeten hoogte van de instructiebalk, niet op een vaste afstand.

---

### Epic ONDERWEG en HAVEN: SPEC-features verder ontworpen

Deze features staan in SPEC 5 en 7. Hier de ontwerpkeuzes die nog ontbreken.

#### ONDERWEG-01 Tabblad Onderweg
Zie SPEC 5.2. Ontwerp:
- Bovenaan een tijdlijn van de route (verticale lijn) met per dag de etappes; daarlangs de stops op hun plek: tanken (met "laatste kans voor 40 km"), eten, boodschappen, overnachten.
- Filterchips: Overnachten, Tanken, Eten, Boodschappen.
- Elk item: naam, afstand langs de route, omvaren of lopen ("200 m lopen vanaf aanlegplaats"), en een primaire actie: "Toevoegen als tussenstop".
- Op de kaart dezelfde items alleen in de corridor van de route.
Prioriteit: Should (fase 1 in SPEC) · Omvang: L · Overnachten aan wal en tankplanning Plus.

#### HAVEN-01 Havenmeester beheert eigen gegevens
**Als** havenmeester (Marieke) **wil ik** zonder account via een link mijn haven bijwerken (liggeld, plaatsen, voorzieningen, contact, foto) **zodat** schippers de juiste informatie zien en minder bellen.
Prioriteit: Could · Omvang: M · Raakt SPEC 7.3, 7.4

Acceptatiecriteria:
- Persoonlijke link per haven (ondertekend token), formulier met de velden uit DATA-05.
- Wijzigingen worden na een korte controle zichtbaar met bron "havenmeester, datum".
- Dit is de opstap naar het havendashboard (SPEC 7.4).

#### HAVEN-02 Reserveren met heldere status
Zie SPEC 7.3. Ontwerp aanvulling: de status van een aanvraag staat op drie plekken (tochtoverzicht, havenpaneel, naderingskaart bij aankomst), altijd met dezelfde woorden: Aangevraagd, Bevestigd (met box en instructie), Afgewezen (met alternatieven in de buurt), Verlopen. Prioriteit: Could (fase 3) · Omvang: XL.

---

## 6. Releaseplan

| Release | Inhoud | Doel | Duur (indicatie) |
| --- | --- | --- | --- |
| **2.4 Fundament** | FIX, APP-02, APP-03, ONB-01, ONB-02, VEI-01, NAV-03, NAV-04, NAV-08, TECH-02, TECH-03 (basis), JUR-02 | Geen bekende bugs, veilige eerste start, navigatie die niet wegvalt | 2 tot 3 weken |
| **2.5 Vertrouwen** | DATA-01, DATA-03, DATA-04, NAV-01, NAV-02, NAV-07 (met wat er aan data is), VEI-03, KAART-01, KAART-02, KAART-03, PLAN-01, TECH-01 | Betrouwbare hoogtes, rustige navigatie, eigen zoekindex, productieklare kaart | 4 tot 6 weken |
| **2.6 Afwerking** | DS-01 t/m DS-03, DS-06, ONB-03, ONB-04, KAART-04 t/m KAART-06, PLAN-02 t/m PLAN-04, TOCHT-01, LEER-01, LEER-02, TECH-05, TECH-07, JUR-01 | Ziet er professioneel uit, werkt offline, plannen met datum | 4 tot 6 weken |
| **3.0 Account en Plus** | ACC-01 t/m ACC-06, JUR-03, TECH-06, DATA-02, PLAN-06, ONDERWEG-01, APP-01, APP-04 t/m APP-07 | Verdienmodel live, app in de winkels | 6 tot 8 weken |
| **3.x Live en groei** | NAV-09, DS-04, DS-05, VEI-02, VEI-04, TOCHT-02 t/m TOCHT-04, LEER-03, LEER-04, ACC-07, DATA-05, DATA-06, HAVEN-01, HAVEN-02, SPEC fase 3 en 4 | Live data, heel Nederland, reserveren | doorlopend |

Dit past in de fasering van SPEC 9: 2.4 tot 2.6 zijn de voorwaarden die fase 1 en 2 pas echt bruikbaar maken; 3.0 is fase 2; 3.x is fase 3 en 4.

---

## 7. Definition of done (aanvulling op SPEC 9)

Een story is klaar als:

- `npm run build`, `npm run lint` (zonder waarschuwingen), `npm run test:routes`, de unit-tests, de end-to-end-tests en `cd mobile && npm run typecheck` groen zijn.
- De wijziging in web en app zit, of de story zegt expliciet dat hij voor één van beide is.
- Schermafbeeldingen op 375 × 667, 420 × 820 en 1280 × 800 zijn bekeken; geen console-fouten.
- Toegankelijkheid: tikoppervlak, labels en focus voldoen (DS-03); axe geeft geen fouten.
- Werkt offline voor alles wat op het water nodig is, en werkt als gast zonder Supabase.
- Teksten volgen de styleguide (geen streepjes, je-vorm, Nederlands) en staan in `src/i18n/nl.ts`.
- Events voor analytics zijn toegevoegd waar de story dat noemt.
- Een regel in `CHANGELOG.md`, en README of docs bijgewerkt als er scripts, data of instellingen bijkomen.

---

## 8. Meetpunten

Waaraan je ziet dat Vaarmaat professioneel is, en blijft:

| Meetpunt | Doel |
| --- | --- |
| Sessies zonder crash | 99,5 procent of meer |
| Routeberekening (p95, telefoon) | onder 1 seconde in de huidige regio, onder 2 seconden landelijk |
| Nieuwe gebruiker tot eerste route | onder 60 seconden (inclusief onboarding) |
| Gestarte navigaties die bij de bestemming eindigen | 70 procent of meer |
| Bruggen met bekende hoogte op de 20 populairste routes | 90 procent of meer |
| Beweegbare bruggen en sluizen met bedieningstijden op die routes | 80 procent of meer |
| Overnachtingsplekken met naam | 90 procent of meer |
| Meldingen "Klopt dit niet?" verwerkt binnen 14 dagen | 90 procent of meer |
| Waardering in de winkels | 4,5 of hoger |
| Proef naar betaald (Plus) | 25 procent of meer |
