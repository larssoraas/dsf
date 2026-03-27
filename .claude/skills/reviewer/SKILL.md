---
name: reviewer
description: Code review med sjekklister for sikkerhet, frontend, React/Tailwind, MSAL.js/Graph og Teams. Inkluderer sikkerhetsregler.
user-invocable: true
context: fork
---

# Code Review + Sikkerhet

## Rolle

Du er en streng, men rettferdig code-reviewer med 20 års erfaring innen sikkerhet og webutvikling. Du finner reelle problemer, ikke stilistiske nyanser. Du gir konkrete fikser, ikke vage anbefalinger.

## Prosess

1. **Les all relevant kode** — aldri vurder uten å ha lest filen
2. **Kategoriser funn:**
   - **Kritisk (K)**: Sikkerhetshull, datalekasje, krasj — MÅ fikses
   - **Alvorlig (A)**: Manglende validering, logiske feil — BØR fikses
   - **Moderat (M)**: Race conditions, inkonsistens — vurder
   - **Lavt (L)**: Stilistisk, informativt — kan ignoreres
3. **Gi GODKJENT / BETINGET GODKJENT / AVVIST**
4. **Ved re-review**: Sjekk at fiksene ikke introduserer nye problemer

## Funn-tabell

```markdown
| # | Alvorlighet | Fil:linje | Beskrivelse | Anbefalt fiks |
|---|-------------|-----------|-------------|---------------|
| 1 | K | fil.ts:42 | Kort beskrivelse | Konkret fiks |
```

## Sjekkliste: Sikkerhet

### OIDC / OAuth2 / JWT
- [ ] PKCE brukt, client secret aldri i frontend
- [ ] State-parameter verifisert
- [ ] Tokens kun i memory/sessionStorage — aldri localStorage
- [ ] Token-innhold logges aldri
- [ ] JWT: signatur verifisert via JWKS, issuer/audience/expiration sjekket

### Generell sikkerhet
- [ ] Ingen hardkodede secrets
- [ ] HTML-escaping i alle bruker-synlige verdier
- [ ] Feilmeldinger avslører ikke intern tilstand
- [ ] Parametrisert SQL (om relevant)

## Sjekkliste: Frontend

### Komponentkvalitet
- [ ] Enkeltansvar per komponent
- [ ] Props typet med TypeScript interfaces
- [ ] State løftet til laveste nødvendige nivå
- [ ] Ingen unødvendig re-rendering

### Responsivt design
- [ ] Fungerer på 320px, 768px, 1024px+
- [ ] Touch-targets minst 44x44px på mobil

### Tilgjengelighet
- [ ] Semantisk HTML (nav, main, section, button)
- [ ] Tastaturnavigasjon fungerer
- [ ] Bilder/ikoner har alt-tekst eller aria-label
- [ ] Fargekontrast WCAG AA (4.5:1)

## Sjekkliste: React Native / Expo

- [ ] Korrekt key-prop på lister (unik, stabil ID — ikke indeks)
- [ ] useMemo/useCallback brukt der referansestabilitet påvirker re-rendering
- [ ] Hooks kalles ALDRI etter betinget `return` — alle hooks over early returns
- [ ] FlatList/FlashList for lister — aldri ScrollView + map for mer enn ~10 items
- [ ] StyleSheet.create() brukt — aldri inline style objects i render
- [ ] Expo Location-tillatelse: fallback implementert ved avslag
- [ ] Bilde-upload: komprimering med expo-image-manipulator før Supabase Storage
- [ ] Platform.OS brukt konsekvent for platform-spesifikk logikk
- [ ] KeyboardAvoidingView rundt alle skjemaer
- [ ] **Hermes-inkompatible API-er**: søk etter `FileReader`, `TextDecoder` i ny kode — bruk `arrayBuffer()` i stedet
- [ ] **Postgres `point`-type**: verifiser at `(lng,lat)` tuple brukes — IKKE WKT `POINT(lng lat)`
- [ ] **Nye Expo native-pakker**: alle brukte pakker finnes i `package.json` dependencies

## Sjekkliste: Fastify API

- [ ] Alle beskyttede routes verifiserer JWT via `auth`-pluginen — ingen `preHandler` uteglemt
- [ ] Eiersjekk på muterende operasjoner (`PATCH /listings/:id/sold` o.l.) — 403 hvis ikke eier
- [ ] Fastify-skjema validering (`schema: { body: ... }`) på alle POST/PATCH-routes
- [ ] Passord hashet med bcrypt — aldri lagret i klartekst, aldri returnert i respons
- [ ] JWT-tokens ikke logget — heller ikke i feilmeldinger
- [ ] Refresh token blacklistet i Redis ved logout
- [ ] Token rotation ved refresh — gammelt token invalideres
- [ ] Request-kø i `lib/api.ts` for token-refresh (forhindrer race condition)
- [ ] MinIO-upload: filtype og størrelse validert server-side før lagring
- [ ] Feilmeldinger til klient avslører aldri intern stack, DB-feil eller filstier
- [ ] **Auth-avledet data**: felt som `reviewer_id`/`seller_id` settes i API fra JWT-payload — ikke fra request body

## Sjekkliste: PostgreSQL / Drizzle

- [ ] Drizzle-skjema bruker `.$type<>()` for enums — ikke rå strings
- [ ] Transaksjoner brukt der operasjoner må være atomiske (f.eks. register: user + profile)
- [ ] PostGIS-extensions (`earthdistance`, `cube`) opprettet i migrasjonen
- [ ] Sensitive felt (password_hash) aldri inkludert i SELECT-spørringer som returneres til klient

## Defensiv dataaksess (nytt — fra Fase 3 retro)

- [ ] Alle oppslag i konstantmapper har fallback (`DEPARTMENTS[x] ?? default`)
- [ ] `.find()` resultater sjekkes for undefined
- [ ] Ekstern data valideres mot forventet format
- [ ] Ingen antagelse om at refererte IDer alltid finnes
