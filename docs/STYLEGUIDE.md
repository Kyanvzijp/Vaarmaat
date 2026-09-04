# Vaarmaat — styleguide

Versie 1.0, september 2026. Deze gids bepaalt hoe Vaarmaat eruitziet, klinkt en aanvoelt. Claude Code gebruikt hem bij elke UI-wijziging; de waarden staan als CSS-variabelen in `src/index.css`.

---

## 1. Merk

**Naam.** Vaarmaat. Twee betekenissen: je maat aan boord (de ervaren vriend die naast je staat) en "maat" als in maatvoering (hoogte, diepgang, afstand). Schrijfwijze altijd met hoofdletter V, één woord. Nooit "VaarMaat" of "Vaar Maat". Het Plus-abonnement heet "Vaarmaat Plus".

**Belofte in één zin.** Zoals Google Maps, maar voor het water, en hij leert je varen terwijl je vaart.

**Persoonlijkheid.** Rustig, kundig, vriendelijk. De schipper naast je die weet wat er komt en het je op tijd vertelt, zonder te belerend te zijn. Nooit paniekerig, nooit betuttelend, nooit jargon zonder uitleg.

**Logo.** Woordmerk in Outfit Bold, kleur Diepblauw, met een beeldmerk: een cirkel (kompasroos, 24 px raster) met daarin een stuurboordgroene en een bakboordrode boog links en rechts en een witte boegpijl naar boven. Werkt als favicon op 16 px, als app-icoon op 512 px en als monochroom merk in wit op blauw. Nooit uitrekken, nooit een schaduw, minimaal 8 px vrije ruimte rondom.

---

## 2. Kleur

Kleuren zijn functioneel: blauw is de app, groen en rood zijn de vaarwereld (stuurboord en bakboord, groen licht en rood licht), oranje is beweegbaar en wachten, paars is sluis.

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `--blue` | `#0A66FF` | primaire acties, geselecteerde route, actieve tab |
| `--blue-dark` | `#0747B3` | hover en actieve staat van primaire knoppen |
| `--blue-soft` | `#EEF3FF` | achtergrond van geselecteerde chips, kaarten, gates |
| `--ink` | `#12203A` | alle lopende tekst, navigatiebalk in navigatiemodus |
| `--muted` | `#5D6B85` | secundaire tekst, labels, metadata |
| `--line` | `#E3E8F0` | randen, scheidingslijnen |
| `--surface` | `#FFFFFF` | panelen, kaarten, sheets |
| `--canvas` | `#F2F5FA` | invoervelden, chips, lichte vlakken |
| `--water` | `#DFE9F5` | paginakleur achter de kaart tijdens laden |
| `--starboard` | `#0A8F5B` | vertrekpunt, "toegestaan", groen licht, klaar |
| `--port` | `#D33B3B` | bestemming, verboden, rood licht, fouten, stop |
| `--movable` | `#E08A00` | beweegbare brug, wachten, let op |
| `--lock` | `#8A2BE2` | sluis, overnachting |
| `--track` | `#FF5A1F` | gevaren spoor in het logboek |
| `--warn-bg` / `--warn` | `#FFF4E0` / `#8A5300` | waarschuwingsvlak en tekst |
| `--err-bg` / `--err` | `#FFE8E8` / `#A02020` | foutvlak en tekst |
| `--ok-bg` / `--ok` | `#E3F7EA` / `#0A6B43` | succesvlak en tekst |

Regels. Tekst op `--surface` is altijd `--ink` of `--muted` (contrast 12:1 en 5,6:1). Wit op `--blue` en op `--ink` is toegestaan (4,6:1 en 14:1). Nooit `--movable` of `--starboard` als tekstkleur op wit voor lopende tekst; alleen als achtergrond, rand of icoon. Rood en groen nooit als enige drager van betekenis: altijd met tekst of icoon erbij (kleurenblindheid).

**Donkere modus (later).** Zelfde tokens, andere waarden: `--surface #141B2B`, `--canvas #1C2536`, `--ink #EEF2F8`, `--muted #9AA7BD`, `--line #2A3446`, `--blue #4C8DFF`. Kaarttegels krijgen een lichte dimfilter (`filter: brightness(0.85)`) in plaats van een donkere kaartstijl, zodat OpenSeaMap-symbolen leesbaar blijven. Navigatiemodus 's nachts: automatisch donker tussen zonsondergang en zonsopkomst (weerdata), instelbaar.

---

## 3. Typografie

**Lettertype.** Outfit (Google Fonts) voor alles: 400 voor lopende tekst, 600 voor labels en knoppen, 700 voor koppen en grote getallen. Systeemfallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`. Geen tweede lettertype in de app; het serif-lettertype uit de andere merken van Flits Group wordt hier niet gebruikt.

**Schaal (px, regelhoogte).**

| Rol | Grootte | Gewicht | Waar |
| --- | --- | --- | --- |
| Display | 28 / 32 | 700 | instructie in navigatiemodus, resterende tijd |
| Kop 1 | 22 / 26 | 700 | paginatitel, route-samenvatting ("1 u 36 min") |
| Kop 2 | 17 / 22 | 700 | sectiekop in les, naam in naderingskaart |
| Body | 15 / 22 | 400 | lopende tekst, stappen, lesinhoud |
| Label | 13 / 18 | 600 | knoppen, chips, tabs, veldlabels |
| Meta | 12 / 16 | 400 | metadata, afstanden, bijschriften, `--muted` |
| Micro | 11 / 14 | 400 | tabbalk-labels, dagbadges |

Getallen die tijdens het varen gelezen worden (snelheid, afstand, tijd) altijd 700 en minimaal 17 px; in navigatiemodus 20 px of groter. Decimaalteken is een komma. Eenheden met een spatie: `12,5 km`, `9 km/u`, `1,40 m`. Tijden als `13:40`, duur als `1 u 36 min`.

---

## 4. Ruimte, vorm en diepte

**Raster.** Basiseenheid 4 px. Binnenmarge van panelen 12 tot 14 px op telefoon, 16 px op desktop. Verticale ruimte tussen blokken 8 px (binnen een groep), 12 px (tussen groepen), 18 px (tussen secties).

**Hoeken.** Panelen en sheets 16 px (`--radius`). Kaarten en velden 12 px. Chips en badges volledig rond (999 px). Knoppen 12 px. Kaartmarkers rond.

**Schaduw.** Eén schaduw voor zwevende elementen: `0 6px 24px rgba(10, 30, 70, 0.18)`. Geen schaduw op elementen die in een paneel liggen; daar scheiden we met `--line` of een `--canvas` vlak.

**Lagen (z-index).** Kaart 0, kaartbedieningen 400, bovenbalk en sheets 500, naderingskaart 650, overlays (Leren, Tochten, Aan boord) 600, tabbalk 700, zoekresultaten 600 binnen de bovenbalk.

**Breedtes.** Telefoon: alles volledige breedte met 12 px marge. Vanaf 900 px: bovenbalk en sheets 440 px links, navigatiepanelen 520 px, overlays 560 px links met de kaart rechts zichtbaar.

---

## 5. Componenten

**Knoppen.** Primair: `--blue` achtergrond, wit, 12 px hoeken, 12 px verticale padding, volle breedte in sheets. Secundair: `--canvas` achtergrond, `--line` rand, `--ink` tekst. Gevaar: `--err-bg` achtergrond, `--err` tekst (alleen voor stoppen, wissen). Klein: 5 × 10 px padding, 12 px tekst, voor acties in lijsten. Icoonknop: 30 px rond, `--canvas`, voor sluiten en verwijderen. Minimale tikoppervlakte overal 44 × 44 px; in navigatiemodus 56 px.

**Chips.** Voor keuzes (boottype, alternatieven, subtabs): `--canvas` met `--line`; actief `--blue-soft` met `--blue` rand en `--blue-dark` tekst, of, bij subtabs, `--ink` gevuld met wit.

**Velden.** `--canvas` vlak, `--line` rand, 12 px hoeken, label erboven in 13 px, eenheid rechts in `--muted`. Numerieke velden met `inputmode="decimal"`. Foutstaat: `--port` rand plus tekst eronder.

**Sheets (onder).** Handvat van 40 × 4 px in `#CFD6E2`, kop met titel en sluitknop, maximaal 46 procent van de schermhoogte ingeklapt, 78 procent uitgeklapt. Scrollt binnenin; de kaart erachter blijft bedienbaar.

**Kaartelementen.** Pin A stuurboordgroen, pin B bakboordrood, tussenpunten blauw genummerd, overnachting paars met bedicoon en dagbadge. Geselecteerde route: 6 px `--blue` op een 10 px witte onderlijn. Alternatieven: 6 px `#7A8699` op 60 procent. Bruggen: cirkel 6 px, vaste brug `#334`, beweegbaar `--movable`. Sluizen: cirkel 7 px `--lock`. POI-markers: 26 px witte cirkel met 2 px rand in de categoriekleur en het categorie-icoon; favorieten met een gele ring `#FFD54A`. Bootpositie: blauwe pijl 34 px met witte rand, gedraaid op koers. Spoor: 3 px `--track` gestippeld.

**Stappenlijst.** Icoon in een 30 px cirkel (`--blue-soft`; bruggen `--warn-bg`; sluizen `#F1E6FF`), tekst 14 px, afstand vanaf start rechts in `--muted`. Afslagen als pijlen (↰ ↱ ↖ ↗ ↑ ↶), objecten als emoji (🌉 ⏳ 🔒 🚩 🏁). Vervang emoji later door een eigen iconenset (zie 6).

**Waarschuwingen.** Drie niveaus. Zacht: `--canvas` vlak met `--muted` tekst (informatie, onbekende hoogte). Let op: `--warn-bg` met `--warn` (brug moet open, windkracht 5). Fout of verboden: `--err-bg` met `--err` (geen route, afmeerverbod, niet varen). Altijd een icoon of woord vooraan, nooit alleen kleur.

**Naderingskaart.** Witte kaart met 6 px linkerrand in `--lock` (sluis) of `--movable` (brug), groot icoon, "Over ongeveer X min", naam in Kop 2, bedieningsfeiten als definitielijst, korte checklist, één primaire knop naar de uitleg. Verschijnt onder de navigatiebalk, wegtikbaar, verschijnt per object één keer.

**Gates (Plus).** Zelfde vorm als een kaart in `--blue-soft`, met ster-icoon, één zin wat Plus hier toevoegt, knop "Probeer 14 dagen gratis" en een tekstlink "Wat zit er in Plus?". Nooit een gate over veiligheidsinhoud.

**Seinen (bruglichten).** Verticale zwarte balk `#222` met lampjes van 14 px in `#E0261C`, `#1FA33A`, `#F2C200`, met gloed (`box-shadow 0 0 6px`). Volgorde van boven naar beneden zoals bij de echte brug.

---

## 6. Iconografie

Nu emoji (werkt overal, geen assets). Doel: een eigen lijnset van 24 px, 2 px lijndikte, ronde uiteinden, in `--ink` of de categoriekleur. Minimaal nodig: route, afslag links, rechts, houd links, houd rechts, rechtdoor, brug vast, brug beweegbaar, sluis, haven, aanlegplaats, anker, tank, vuilwater, drinkwater, helling, winkel, werf, hotel, bed, restaurant, boodschappen, weer (zon, bewolkt, regen, onweer, wind), spraak aan en uit, locatie, favoriet, ster (Plus), checklist, logboek, leren, instellingen, delen, telefoon, marifoon, waarschuwing, verboden. Emoji en eigen iconen nooit mengen in dezelfde lijst.

---

## 7. Kaart

Basiskaart OpenStreetMap standaard; satelliet als optie; OpenSeaMap-symbolen standaard aan. Zoombereik 9 tot 19. Bedieningen rechtsboven onder de bovenbalk. Nooit meer dan 600 POI-markers tegelijk; onder zoom 14 alleen havens, tankstations en favorieten; onder zoom 12 geen POI's. Route altijd passend in beeld met ruimte voor de bovenbalk en de sheet (padding boven 230 px, onder 48 procent van de hoogte op telefoon). In navigatiemodus volgt de kaart de boot op zoom 15 of hoger; slepen zet volgen uit, knop "Volg mij" zet het aan. Koers-omhoog-modus als optie (rotatie van de kaart), standaard noord-omhoog.

---

## 8. Navigatiemodus

Alles groter en rustiger. Tabbalk verdwijnt. Bovenin de instructiebalk: `--ink` achtergrond (brug `#6A4300`, sluis `#4A1F8A`, aankomst `--starboard`, fout `#7A1F1F`), icoon 34 px, afstand in Meta wit op 85 procent, instructie in Display wit, detail eronder. Daaronder een klein wit vlak "daarna …". Onderin: vijf getallen (snelheid, resterend, afstand, aankomst, koers) in Kop 2 met Micro-labels, dan de knoppen Volg mij, spraak, Stop. Geen andere elementen. Schermvergrendeling voorkomen met Wake Lock API tijdens navigatie. Spraakmomenten: 600 m (1 km voor brug en sluis), 150 m en bij de afslag; nadering van sluis of brug bij de ingestelde tijd; van de route af; aankomst.

---

## 9. Schrijfstijl

Nederlands, je-vorm, korte zinnen, actief. Werkwoorden vooraan in knoppen: "Start navigatie", "Bewaren", "Vaar hierheen", "Probeer 14 dagen gratis". Instructies in de gebiedende wijs: "Sla linksaf naar de Oude Rijn", "Vaar onder Zijlbrug door", "Wacht op opening Lisserbrug", "Schut door Julianasluis". Waarschuwingen beginnen met wat je moet doen of weten: "Let op: op deze route zit een brug lager dan je boot". Foutmeldingen zeggen wat er mis is en wat je kunt doen: "Geen vaarweg gevonden bij Leiden. Kies een punt op of vlak bij het water."

Geen streepjes als leesteken (geen en-dash of em-dash); gebruik komma, punt of dubbele punt. Geen uitroeptekens behalve in de les Veiligheid. Geen Engelse termen als er een Nederlands woord is: aanlegplaats, niet mooring; tussenpunt, niet waypoint; bedieningstijden, niet opening hours. Vaartermen zoals de vaarwereld ze gebruikt: stuurboord, bakboord, doorvaarthoogte, schutten, wachtsteiger, remmingwerk, marifoon, landvast, stootwil.

Getallen: afstanden onder 1 km in tientallen meters ("480 m"), daarboven met één decimaal tot 100 km ("12,5 km"), tijden in minuten tot een uur en daarna "1 u 36 min". Koers in graden met windstreek ("245° ZW"). Windkracht in Beaufort ("windkracht 4, vlagen 6").

---

## 10. Beweging en feedback

Overgangen 150 tot 200 ms, ease-out. Sheets schuiven van onder in; overlays faden. Kaart animeert bij fitBounds en setView (Leaflet standaard). Geen animatie op getallen tijdens navigatie (ze moeten leesbaar blijven). Haptische feedback (Vibration API, 30 ms) bij een nieuwe instructie en bij een naderingskaart, uitschakelbaar. Laadstaten: skeleton-vlakken in `--canvas`, spinner alleen bij routes langer dan 300 ms. Successen kort bevestigen in een zachte waarschuwing ("Tocht bewaard onder Mijn tochten"), automatisch weg na 4 seconden.

---

## 11. Toegankelijkheid

Contrast minimaal 4,5:1 voor tekst en 3:1 voor iconen en randen. Focusring 2 px `--blue` op alle interactieve elementen. Alle iconen met tekst of `aria-label`. Kaartinformatie is ook in lijsten beschikbaar (stappen, bruggen, havens), nooit alleen op de kaart. Spraak is een aanvulling, nooit de enige drager van een instructie. Ondersteun systeemlettergrootte tot 130 procent zonder afgekapte tekst; sheets scrollen. Bewegingsreductie (`prefers-reduced-motion`) schakelt animaties uit.

---

## 12. Assets en implementatie

- Tokens in `:root` in `src/index.css`; nieuwe kleuren alleen als token, nooit hardcoded in componenten.
- Lettertype via Google Fonts met `display=swap`; offline valt hij terug op de systeemstack.
- Favicon en app-icoon als SVG in `public/` (`favicon.svg`, `icon-512.svg`), plus een PNG 512 en 192 voor Android in `public/icons/`.
- Schermafbeeldingen voor de landingspagina op 420 × 820 (telefoon) en 1280 × 800 (desktop), gemaakt met `scripts/screenshot.mjs`.
- Voorbeeldnaam in mockups: "Mijn sloep", voorbeeldroute Kaag naar Leiden.
