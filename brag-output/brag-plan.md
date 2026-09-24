# Brag Plan: Vaarmaat

## What is this app?
Vaarmaat is een routeplanner en navigatie voor de pleziervaart in het Groene Hart en de Hollandse Plassen: afstand, vaartijd en afslagen, afgestemd op de hoogte van je boot.

## The angle
"Google Maps, maar voor het water." Iedereen kent de belofte; niemand heeft het ooit voor een sloep gezien. We laten het echte vaarwegennetwerk uit de app (49.900 knooppunten uit OpenStreetMap) opbloeien tot een kaart, en rekenen daarna live een echte route uit: Kaag naar Leiden. Het bewijs dat het voor het water is: de app weet dat jouw sloep 1,40 m hoog is en dat de Schrijversbrug 1,60 m is. Past.

## Hook (first 2-3 seconds)
Het complete vaarwegennet van het Groene Hart tekent zich razendsnel uit op een waterblauwe achtergrond. Tekst slaat in: "Google Maps." en direct eronder "Maar dan voor het water."

## Key moments (the middle)
- Invoer A "Kaag (Kaagdorp)" en B "Leiden centrum" typen zich in de echte zoekbalk van de app.
- De blauwe route (echte geometrie uit `src/routing.ts`) trekt zich over de vaarwegen; groene startstip, rode bestemmingsstip.
- Samenvatting uit de app: "1 u 55 min (12,7 km)", "12 bruggen".
- Bruggencheck: "Schrijversbrug · doorvaarthoogte 1,60 m" tegenover "Mijn sloep · 1,40 m". Groen vinkje: "Past eronder."
- Navigatiebalk: "Wacht op opening Scheluwbrug" in het oranje van beweegbare bruggen.

## Outro / punchline
"Hij leert je varen terwijl je vaart." Dan het Vaarmaat-logo met "Groene Hart & Hollandse Plassen".

## User flow worth showing
Zoek vertrek en bestemming → route verschijnt met vaartijd en bruggen → afslag voor afslag navigatie met brugcheck op de hoogte van jouw boot.

## Tone
- Preset: polished
- Creative direction: de rustige schipper naast je; zelfverzekerd, zonnig, Nederlands
- Interpretation: weinig scènes, duidelijke holds, zachte slides en crossfades, geen grappen die niet uit het product komen. De humor zit in "Google Maps voor een sloep" en in de brug die net past.

## Format: landscape, 1920x1080
## Duration: 22 seconds

## Visual identity (from the project)
- Background: #DFE9F5 (--water) en #F2F5FA (--canvas)
- Accent: #0A66FF (--blue)
- Text: #12203A (--ink), secundair #5D6B85 (--muted)
- Functioneel: #0A8F5B stuurboord/groen, #D33B3B bakboord/rood, #E08A00 beweegbare brug
- Display font: Outfit 700
- Body font: Outfit 400/600
- Strongest visual element: het logo (kompasroos met rode en groene boog en witte boegpijl) en de blauwe route over het vaarwegennet

## Share copy (draft)
Google Maps, maar dan voor het water: Vaarmaat rekent je vaarroute uit op de hoogte van je boot, brug voor brug.

## Audio direction
- Role: warm bed met spaarzame, nette accenten
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 (steady, clean)
- Music treatment: fade in over 0,4 s, bed rond 0,32, uitfaden over de laatste 1,5 s
- Music cue guidance: preset `cues/happy-beats-business-moves-vol-12…json`, 110 BPM. Strong cues: 8,74 s (route begint te tekenen), 17,47 s (navigatiebalk), 18,56 s (outro regel). Beat grid 13,11 / 13,64 / 14,20 voor de brugcheck-onderdelen; tekst houdt minstens 0,8 s.
- Audio-reactive treatment: subtiel; RMS laat de gloed achter de route en het logo zacht ademen. Geen equalizers.
- SFX posture: sparse, motion-matched
- Audio-coupled moments: toetsaanslagen bij het typen van A en B, zachte drop bij de samenvattingskaart, klik bij het vinkje, één warme bel bij het logo aan het eind.
- Restraint rule: nooit meer dan één accent tegelijk; geen harde impacts.

## Storyboard

### Scene 1 — Het net — 3,4 s
Vaarwegennet Groene Hart tekent zich uit (echte data). "Google Maps." verschijnt, dan "Maar dan voor het water."
Sequential/interaction: ja, twee regels na elkaar; tweede regel houdt ≥1,5 s.
Audio intent: open en zonnig. Audio-coupled idea: zachte drop bij regel twee.
Transition mood: soft → Scene 2

### Scene 2 — Vaarmaat — 2,6 s
Logo schaalt in, wordmark "Vaarmaat", onderregel "Routeplanner voor de pleziervaart".
Sequential/interaction: logo dan tekst. Audio: switch/drop accent. Transition mood: slide → Scene 3

### Scene 3 — De route — 6,8 s
Links de app-kaart (zoekvelden A en B zoals in de app), rechts de ingezoomde vaarkaart. A en B typen zich in. Route trekt zich uit (beat-locked ~8,74 s). Samenvattingssheet: "1 u 55 min (12,7 km)", "12 bruggen · laagste 1,60 m".
Sequential/interaction: gesimuleerd typen; route-tekening. Audio: toetsaanslagen, drop bij sheet.
Transition mood: clean → Scene 4

### Scene 4 — Past hij eronder? — 4,6 s
Brugkaart "Schrijversbrug · doorvaarthoogte 1,60 m" en bootkaart "Mijn sloep · 1,40 m", dan groen label "Past eronder." met vinkje.
Sequential/interaction: drie elementen op every-other-beat, samen vastgehouden. Audio: kaartjes, klik bij vinkje.
Transition mood: slide → Scene 5

### Scene 5 — Navigatie — 1,6 s + Outro 3,0 s
Oranje navigatiebalk "over 400 m · Wacht op opening Scheluwbrug" schuift in (~17,47 s). Daarna outro (18,56 s): "Hij leert je varen terwijl je vaart." met logo en "Groene Hart & Hollandse Plassen".
Audio: bel bij logo, muziek fade.

**Music mood for this video:** upbeat, clean
**Audio summary:** een zonnig bed dat de kaart laat opbloeien, stille klikjes bij interactie, en één warme bel bij de afsluiter.
