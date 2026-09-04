# Van webapp naar App Store en Google Play

Vaarmaat is eerst een PWA: installeerbaar vanuit de browser, offline, met GPS en spraak. Dat is fase 1 tot 3 uit de spec. Daarna komt een native verpakking voor de App Store en Google Play. Dit document beschrijft de gekozen route en wat er dan nodig is, zodat de webapp nu al de juiste kant op gebouwd wordt.

## 1. Aanpak: Capacitor rond dezelfde webapp

Capacitor verpakt de gebouwde site (`dist/`) in een iOS- en Android-app en geeft toegang tot native functies via plugins. De React-code blijft één codebase; er komt geen tweede app. Lovable ondersteunt deze route ook.

Wat er dan verandert per onderdeel:

| Onderdeel | Webapp nu | Native straks |
| --- | --- | --- |
| GPS | `navigator.geolocation` | `@capacitor/geolocation`, ook op de achtergrond tijdens navigatie |
| Spraak | `SpeechSynthesis` | `@capacitor-community/text-to-speech` |
| Scherm aan tijdens navigatie | Wake Lock API | `@capacitor-community/keep-awake` |
| Trillen bij instructie | Vibration API | `@capacitor/haptics` |
| Meldingen | Web Push (VAPID) | `@capacitor/push-notifications` (APNs, FCM) |
| Opslag | localStorage en IndexedDB | zelfde, plus `@capacitor/preferences` voor kleine sleutels |
| Kaarttegels offline | service worker | zelfde webview-cache; grotere gebieden via `@capacitor/filesystem` |
| Betalen voor Plus | Stripe Checkout | In-App Purchase (zie 3) |

Houd daarom in de webapp de browser-API's achter kleine functies (`src/voice.ts`, GPS in `App.tsx`, straks `src/device.ts`), zodat de native variant er met één `if (Capacitor.isNativePlatform())` naast kan.

## 2. Stappen bij de overstap

1. `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android` en `npx cap init Vaarmaat nl.vaarmaat.app --web-dir dist`.
2. `npm run build && npx cap add ios && npx cap add android`, daarna `npx cap sync` na elke build.
3. Iconen en splash: `npm run icons` maakt de PNG's; met `@capacitor/assets` worden daar alle maten voor iOS en Android van gemaakt. Bron: `public/icon-512.svg`.
4. Rechten in `Info.plist` en `AndroidManifest.xml`: locatie (altijd, met uitleg "Vaarmaat gebruikt je locatie om je op het water te navigeren"), meldingen, microfoon niet nodig.
5. Deeplinks: `vaarmaat.nl/t/<id>` als Universal Link (iOS) en App Link (Android), zodat gedeelde tochten in de app openen.
6. Testen op echte toestellen: GPS op het water, spraak met scherm uit, batterijverbruik bij 4 uur navigatie.

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

- PNG-iconen in `public/icons/` (192, 512, maskable, apple-touch-icon) en de SVG-bron.
- `viewport-fit=cover` en de Apple-metatags in `index.html`, zodat de app al goed vult op toestellen met een notch.
- Alle data offline in de bundel en de service worker; geen server nodig om te varen.
- Nederlandse teksten en de styleguide; systeemlettergrootte tot 130 procent wordt ondersteund.
