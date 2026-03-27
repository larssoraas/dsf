# PWA/webapp: Arkitektur og plan

**Dato:** 2026-03-27
**Status:** Planlagt

---

## Tekniske valg

| Valg | Beslutning | Begrunnelse |
|------|-----------|-------------|
| Web-tilnærming | Behold Expo web (`expo start --web`) | Next.js/Vite ville kreve fullstendig migrering; React Native Web gir maksimal kodedeling |
| Responsivt layout | `useWindowDimensions` + max-width container | Erstatter `Dimensions.get('window')` som ikke reagerer på resize; container cap på 640px gir sentrert mobiloppsett på desktop |
| PWA-manifest | Expo web-config i `app.json` + `public/manifest.json` | Expo støtter `expo.web.favicon`/`name`/`themeColor`; service worker krever separat konfig |
| Service worker | `expo-sw` via Expo web build | Tilgjengelig gjennom Expo SDK 52 uten eject |
| Kart på web | Leaflet via `react-leaflet` bak `Platform.select` | Leaflet er lisens-fri, ingen API-nøkkel, god React-integrasjon; native bruker fortsatt `react-native-maps` |
| Bildeopplasting web | HTML `<input type="file">` via `expo-image-picker` (web-støtte er innebygd) | `expo-image-picker` støtter web nativt — `launchImageLibraryAsync` åpner file picker; kamera-knappen skjules på web |
| Desktop-navigasjon | Tab-bar beholdes; sticky posisjonert i bunn på web via CSS | Enklere enn sidebar-navigasjon; tilstrekkelig for MVP |

---

## Avhengighetsgraf

```
F1 (PWA-manifest + web-config)
  |
  F2 (Responsivt layout — feed, kart-fallback, annonseside)
  |
  F3 (Bildeopplasting og kamera-fallback på web)
  |
  F4 (Service worker + offline-melding)
```

F1 er en forutsetning for alle faser (konfigurerer web-byggmiljøet).
F2 og F3 kan implementeres parallelt etter F1 er ferdig.
F4 avhenger av at F2 og F3 er stabile.

---

## Implementeringsplan

### F1: PWA-manifest og web-konfigurasjon

**Leverer:** Appen installeres som PWA fra nettleser (iOS Safari / Chrome Android / Chrome desktop). Riktig navn, ikon og theme-farge.

**Filer:**
- `torget/app.json` — legg til `expo.web` blokk med `bundler: "metro"`, `favicon`, `themeColor`, `backgroundColor`, `name`
- `torget/public/manifest.json` — ny fil: `name`, `short_name`, `display: "standalone"`, `start_url`, `theme_color`, `background_color`, `icons` (192×192 og 512×512 fra eksisterende `assets/icon.png`)
- `torget/public/` — opprett katalog, kopier `assets/icon.png` som `icon-192.png` og `icon-512.png` (eller bruk eksisterende `assets/icon.png` direkte)

**Akseptansekriterier:**
- [ ] `npx expo start --web` starter uten feil
- [ ] Nettleseren viser "Torget" som side-tittel
- [ ] Chrome DevTools → Application → Manifest viser korrekt navn og ikonreferanse
- [ ] "Legg til på hjemskjerm" vises i Safari på iOS og Chrome på Android

---

### F2: Responsivt layout

**Leverer:** Feed, annonseside og meldingsskjermen ser fornuftig ut på desktop (sentrert, maks 640 px bred). `Dimensions.get('window')` erstattes med `useWindowDimensions` der det er brukt til layout.

**Filer:**
- `torget/hooks/useMaxWidth.ts` — ny hook: `const { width } = useWindowDimensions(); return Math.min(width, 640);`
- `torget/components/layout/CenteredContainer.tsx` — ny wrapper-komponent: `maxWidth: 640, alignSelf: 'center', width: '100%'`
- `torget/components/listing/ListingDetail.tsx` — erstatt `Dimensions.get('window').width` med `useWindowDimensions().width`; bildegalleriet bruker dynamisk bredde
- `torget/app/post/preview.tsx` — erstatt `Dimensions.get('window').width` med `useWindowDimensions().width`
- `torget/app/(tabs)/index.tsx` — pakk inn liste i `CenteredContainer`
- `torget/app/(tabs)/map.tsx` — web-fallback: vis lenke til søkesiden i stedet for generisk tekst ("Kartsøk er kun tilgjengelig i mobilappen. Bruk søk for å finne annonser i nærheten.")
- `torget/app/(tabs)/_layout.tsx` — tab-bar: `position: 'fixed'` på web via `Platform.select` for å unngå scroll-problemer

**Akseptansekriterier:**
- [ ] Feed vises sentrert med maks 640 px bredde på skjerm bredere enn 640 px
- [ ] Bildegalleri i annonsedetaljside skalerer korrekt på desktop uten å overflow
- [ ] Tab-bar er synlig og klikkbar på desktop
- [ ] Kartsiden viser brukervennlig melding med lenke til søk

---

### F3: Bildeopplasting på web

**Leverer:** Bildeopplasting i annonseopprettelse og profil-redigering fungerer i nettleser. Kamera-knappen skjules på web (ingen webcam-tilgang).

**Filer:**
- `torget/components/listing/ImagePicker.tsx` — skjul "Ta bilde"-knappen med `Platform.OS === 'web'`; `launchImageLibraryAsync` fungerer allerede på web (åpner OS-filvelger) — verifiser og behold
- `torget/app/profile/edit.tsx` — skjul kamera-alternativ på web; verifiser at `launchImageLibraryAsync` fungerer
- `torget/lib/storage.ts` — verifiser at bildeopplasting via presigned URL fungerer fra nettleser; legg til feilhåndtering for CORS-feil

**Akseptansekriterier:**
- [ ] Bruker kan velge bilde fra fil-systemet på desktop og laste det opp i ny annonse
- [ ] "Ta bilde"-knappen vises ikke i nettleser
- [ ] Profilbilde-opplasting fungerer i nettleser
- [ ] Feilmelding vises (ikke krasj) dersom MinIO ikke er tilgjengelig

---

### F4: Service worker og offline-melding

**Leverer:** Appen kan installeres og viser en meningsfull frakoblet-melding i stedet for tom skjerm ved nettverkstap.

**Filer:**
- `torget/public/sw.js` — minimal service worker: cache app-shell (HTML/JS/CSS) ved `install`, serve fra cache ved `fetch`-feil (network-first strategi)
- `torget/public/offline.html` — enkel HTML-side: "Du er frakoblet internett. Torget krever nettverkstilgang." med logo og retry-knapp
- `torget/app/_layout.tsx` — registrer service worker ved oppstart på web: `if (Platform.OS === 'web' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`

**Akseptansekriterier:**
- [ ] Chrome DevTools → Application → Service Workers viser registrert worker
- [ ] Etter installasjon (`Add to Home Screen`) åpner appen uten nettverkstilgang og viser offline-melding
- [ ] Appen fungerer normalt med nettverkstilgang etter service worker er aktiv
- [ ] `tsc --noEmit` passerer

---

## Risiko

| Risiko | Tiltak |
|--------|--------|
| `expo-image-picker` sin web-implementasjon av `launchImageLibraryAsync` kan returnere `blob:` URI i stedet for fil-path — MinIO-upload kan feile | Test tidlig i F3; legg til `fetch(uri)` → `Blob` → `File`-konvertering i `storage.ts` om nødvendig |
| `Dimensions.get('window')` brukes i styles-objekter utenfor komponenter (module-scope) — disse fanger ikke resize-events | Identifiser alle slike steder i F2 og flytt til `useWindowDimensions` inne i komponenten |
| Service worker cache kan serve utdatert bundle etter oppdatering | Bruk versjonert cache-navn (`CACHE_V1`) + `skipWaiting`/`clients.claim` for å sikre at ny worker tar over umiddelbart |
