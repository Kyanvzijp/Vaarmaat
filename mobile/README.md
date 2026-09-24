# Vaarmaat app (iOS en Android)

Native app van Vaarmaat, gebouwd met Expo SDK 57 en React Native. Zelfde functies als de webapp: routeplanner met alternatieven, afslagen, dagindeling en overnachtingen, aanleggen, weer, navigatie met GPS, spraak en naderingskaart voor sluizen en bruggen, havens en voorzieningen, bootprofiel, tochten, leren, checklists en logboek met GPX delen.

## Proberen op je telefoon

```bash
cd mobile
npm install
npm start
```

Installeer **Expo Go** uit de App Store of Google Play en scan de QR-code (iPhone: met de camera; Android: in Expo Go). Telefoon en computer moeten op hetzelfde netwerk zitten; lukt dat niet, gebruik `npm start -- --tunnel`.

Alle gebruikte modules zitten in Expo Go, dus een eigen build is voor testen niet nodig.

## Hoe het in elkaar zit

- De rekenlogica is gedeeld met de webapp. Imports met `@shared/...` wijzen naar `../src/` (routering, graaf, navigatie, tochtplanner, POI's, weer, zoeken, opslag, lessen), `@data/...` naar `../public/data/`. `metro.config.js` neemt die mappen mee in de bundel. Pas je daar iets aan, dan verandert het in web en app tegelijk.
- `src/App.tsx` is de enige eigenaar van planner- en navigatiestate, net als in de webapp. De panelen in `src/components/` zijn presentational.
- `src/components/ui.tsx` bevat knoppen, chips, velden, schakelaars, waarschuwingen en de sheet onderin, volgens `docs/STYLEGUIDE.md`. Kleuren staan in `src/theme.ts`.
- Kaart: `react-native-maps` met OpenStreetMap-tegels en OpenSeaMap-symbolen; de knop met de satelliet wisselt naar satellietbeeld.
- Opslag: `expo-sqlite` levert een synchrone `localStorage`, zodat `src/store.ts` en `src/profile.ts` uit de webapp ongewijzigd werken.
- De vaarwegengraaf (3 MB) en POI's zitten in de app zelf: routeren werkt zonder internet. Alleen kaarttegels, weer en zoeken op adres hebben internet nodig.

## Controles

```bash
npm run typecheck                 # TypeScript strict, inclusief de gedeelde code uit ../src
npx expo export --platform ios --platform android   # volledige bundel bouwen
npm run web                       # browser-preview zonder kaarttegels (MapView.web.tsx)
npm run screenshot                # schermafbeeldingen van de preview op 420 x 820 (Playwright uit de root)
```

`npm run lint` in de root van de repo lint ook deze map.

## Builds voor de winkels

Met EAS (`eas.json` staat klaar), zonder eigen Mac of Android Studio:

```bash
npx eas-cli login
npx eas-cli build --profile preview --platform all     # installeerbare testversie
npx eas-cli build --profile production --platform all  # voor de App Store en Google Play
npx eas-cli submit --platform all
```

Nodig voor een echte build:

- **Google Maps API-sleutel voor Android** (kaart in `react-native-maps`). Zet hem als EAS-secret `GOOGLE_MAPS_ANDROID_API_KEY`; `app.config.js` leest hem. In Expo Go is hij niet nodig.
- **Eigen tegelprovider**: `tile.openstreetmap.org` mag niet voor zware app-belasting gebruikt worden. Pas `OSM` in `src/components/MapView.tsx` aan naar bijvoorbeeld MapTiler of Stadia.
- Apple Developer- en Google Play-account. Bundle-id en package: `nl.vaarmaat.app`.

Zie `../docs/APPSTORE.md` voor betalen (In-App Purchase), privacy en wat de winkels verder vragen.

## Nog niet in de app

- Achtergrond-GPS met scherm uit (nu: scherm blijft aan tijdens navigatie).
- Inloggen en synchronisatie met Supabase (de webapp heeft de basis in `src/backend/`).
- Offline kaarttegels.
