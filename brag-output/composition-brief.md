# Hyperframes Composition Brief: Vaarmaat

## Objective
Een korte launch-achtige brag video voor Vaarmaat.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape, 1920x1080
- Duration: 22 seconds

## Source Material
- Project root: repository root
- Primary files read: `index.html`, `README.md`, `docs/STYLEGUIDE.md`, `src/index.css`, `src/components/RoutePanel.tsx`, `src/components/NavPanel.tsx`, `public/favicon.svg`, `public/data/graph.json`, `scripts/test_route.ts`
- Product name: Vaarmaat
- Tagline / strongest claim: "Zoals Google Maps, maar voor het water, en hij leert je varen terwijl je vaart."
- Key UI to recreate: bovenkaart met zoekvelden A en B, route-samenvatting, navigatiebalk bij een beweegbare brug
- Real data: vaarwegennet (OSM, via `public/data/graph.json`) en de route Kaag naar Leiden berekend met `src/routing.ts` (12,7 km, 1 u 55 min, 12 bruggen, Schrijversbrug 1,60 m, Scheluwbrug beweegbaar). Bundled in `composition/assets/data/data.js`.
- Copy that must appear verbatim:
  - Maar dan voor het water.
  - Groene Hart & Hollandse Plassen
  - Wacht op opening Scheluwbrug
  - Hij leert je varen terwijl je vaart.

## Creative Direction
- Tone preset: polished
- Creative direction: de rustige schipper naast je
- Angle, hook, outro: zie `brag-plan.md`
- Avoid: generieke SaaS-taal, abstracte vulling, streepjes als leesteken in teksten (projectregel)

## Visual Identity
- Background: #F2F5FA land, waterlijnen #9DB8DC
- Text: #12203A, secundair #5D6B85
- Accent: #0A66FF; functioneel #0A8F5B, #D33B3B, #E08A00
- Display/body font: Outfit (lokale woff2)
- Visual references: logo uit `public/favicon.svg`, app-kaarten met radius 16 en schaduw `0 6px 24px rgba(10,30,70,.18)`

## Storyboard
Zie `brag-plan.md`. Samenvatting:
1. Het net — 3,4 s — vaarwegennet + "Google Maps." / "Maar dan voor het water."
2. Vaarmaat — 2,6 s — logo en naam
3. De route — 6,8 s — A/B typen, route tekent, samenvatting
4. Past hij eronder? — 4,1 s — brug 1,60 m vs sloep 1,40 m
5. Navigatie — 1,9 s — "Wacht op opening Scheluwbrug"
6. Outro — 3,2 s — "Hij leert je varen terwijl je vaart."

## Audio
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`, volume 0,32, fade in/out
- Music cue guidance: `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (110 BPM; strong cues 8,74 / 17,47 / 18,56)
- Audio-reactive: bass laat routegloed en logogloed subtiel ademen (per-frame data in `assets/data/data.js`)
- SFX: toetsaanslagen, zachte drops, klik bij vinkje, één bel bij het logo. Low HF-risk keuzes.
