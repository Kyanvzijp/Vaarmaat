# Van webapp naar App Store en Google Play

Vaarmaat is eerst een PWA: installeerbaar vanuit de browser, offline, met GPS en spraak. Dat is fase 1 tot 3 uit de spec. Daarnaast is er een native app voor de App Store en Google Play in `mobile/`. Dit document beschrijft de gekozen route en wat er dan nodig is, zodat de webapp nu al de juiste kant op gebouwd wordt.

## 1. Aanpak: native app met Expo, logica gedeeld met de webapp

De app voor iOS en Android staat in `mobile/` en is gebouwd met Expo (React Native). Eerder was Capacitor rond de webapp het plan; gekozen is voor Expo omdat kaart, GPS, spraak en scherm-aan dan echt native zijn. De prijs: er zijn twee UI-lagen (web in `src/components/`, app in `mobile/src/components/`). De rekenlogica is één codebase: de app importeert `src/routing.ts`, `graph.ts`, `navigation.ts`, `trip.ts`, `pois.ts`, `weather.ts`, `geocode.ts`, `store.ts`, `profile.ts` en `content/lessons.ts` rechtstreeks via het pad `@shared/`, en bundelt `public/data/*.json`.

| Onderdeel | Webapp | App (`mobile/`) |
| --- | --- | --- |
| Kaart | Leaflet | `react-native-maps` met OSM- en OpenSeaMap-tegels, satelliet via de native kaart |
| GPS | `navigator.geolocation` | `expo-location` (voorgrond; achtergrond volgt, zie 2) |
| Spraak | `SpeechSynthesis` | `expo-speech` (`mobile/src/voice.ts`, zelfde API) |
| Scherm aan tijdens navigatie | Wake Lock API | `expo-keep-awake` |
| Opslag | localStorage | synchrone localStorage uit `expo-sqlite`, dus `src/store.ts` werkt ongewijzigd |
| GPX delen | download | `expo-file-system` en het deelmenu (`expo-sharing`) |
| Data | `fetch('/data/*.json')` | meegebundeld, dus ook zonder internet |
| Betalen voor Plus | Stripe Checkout | In-App Purchase (zie 3) |

Regel: nieuwe logica (routering, kosten, planners) hoort in `src/` zonder browser-API's, zodat web en app hem allebei gebruiken. Browserspecifieke dingen blijven achter kleine functies zoals `src/voice.ts`.

## 2. Stappen naar de winkels

1. Ontwikkelen: `cd mobile && npm install && npm start`, openen in Expo Go op je telefoon. Zie `mobile/README.md`.
2. Accounts: Expo (EAS), Apple Developer Program en Google Play Console. Bundle-id en package: `nl.vaarmaat.app`.
3. Android heeft voor de kaart een Google Maps API-sleutel nodig in echte builds: zet `GOOGLE_MAPS_ANDROID_API_KEY` als EAS-secret (`app.config.js` leest hem).
4. Kaarttegels: `tile.openstreetmap.org` is niet bedoeld voor een app met veel gebruikers. Neem voor de winkelversie een tegelprovider (bijvoorbeeld MapTiler of Stadia) en pas `OSM` in `mobile/src/components/MapView.tsx` aan.
5. Builds: `npx eas-cli build --profile preview` voor testtoestellen, `--profile production` en `npx eas-cli submit` voor de winkels (`mobile/eas.json`).
6. Achtergrond-GPS tijdens navigatie (scherm uit): `expo-location` met `startLocationUpdatesAsync` en `expo-task-manager`, plus de rechten "altijd" met uitleg "Vaarmaat gebruikt je locatie om je op het water te navigeren".
7. Deeplinks: `vaarmaat.nl/t/<id>` als Universal Link (iOS) en App Link (Android); het schema `vaarmaat://` staat al in `app.json`.
8. Testen op echte toestellen: GPS op het water, spraak met scherm uit, batterijverbruik bij 4 uur navigatie.

## 3. Betalen: de regels van de winkels

Apple en Google eisen dat een digitaal abonnement dat in de app wordt afgesloten via hun eigen In-App Purchase loopt. Stripe Checkout mag wel op de website, niet in de native app. Gevolg voor Vaarmaat Plus:

- Eén tabel `subscriptions` blijft de bron van waarheid. Naast de kolom `stripe_subscription_id` komt een kolom `store_product_id` en `store: 'stripe' | 'apple' | 'google'`.
- Aanbevolen: RevenueCat als laag boven StoreKit en Google Play Billing. De RevenueCat-webhook schrijft, net als de Stripe-webhook, naar `subscriptions`. `has_plus()` hoeft dan niet te veranderen.
- Prijzen in de winkels: dezelfde 4,99, 14,99 en 24,99 (de winkels houden 15 tot 30 procent in; dat is de prijs van distributie).
- Proefperiode van 14 dagen: via de winkel als "free trial" op het product, niet via `trial_until`.

## 4. Wat de winkels verder vragen

- Apple Developer Program (jaarlijks) en een Google Play-ontwikkelaarsaccount (eenmalig).
- Privacyverklaring op een openbare URL, en de "App Privacy" opgave bij Apple: locatie (voor navigatie, niet gekoppeld aan identiteit), e-mail (account), aankoopgeschiedenis.
- Screenshots per toestelklasse: `npm run screenshot` levert de basis (420 × 820 en 1280 × 800); voor de winkels zijn de exacte iPhone- en iPad-maten nodig.
- Een testaccount met actief Plus voor de reviewers, en een korte uitleg dat de app zonder account werkt.
- Contentregels: veiligheidsinhoud gratis, geen medische of juridische claims, bronvermelding OpenStreetMap en OpenSeaMap in het scherm "Over".

## 5. Wat nu al klaar is voor die stap

- De Expo-app in `mobile/` met alle schermen van de webapp: planner, alternatieven, afslagen, dagindeling, aanleggen, weer, navigatie met spraak en naderingskaart, havens, bootprofiel, tochten, leren, checklists, logboek en instellingen.
- Iconen uit `public/icons/` in `mobile/assets/`, bundle-id `nl.vaarmaat.app`, locatierechten met Nederlandse uitleg.
- Alle data offline in de bundel; geen server nodig om te varen.
- Nederlandse teksten en de styleguide; systeemlettergrootte tot 130 procent wordt ondersteund.
