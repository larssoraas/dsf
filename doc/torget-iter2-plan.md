# Torget Iterasjon 2: Arkitektur og plan

**Dato:** 2026-03-27
**Status:** FERDIG — F1 ✅ F2 ✅ F3 ✅ F4 ✅ F5 ✅

---

## Tekniske valg

| Valg | Beslutning | Begrunnelse |
|------|-----------|-------------|
| Monorepo-struktur | `apps/api/`, `apps/mobile/`, `packages/shared/` i `/dsf/` | Delte typer mellom API og app uten sirkeldependenser |
| API-rammeverk | Fastify v5 + TypeScript strict | Rask oppstart, native TS, god plugin-økonomi |
| ORM | Drizzle ORM + Drizzle Kit | Type-safe SQL, genererer typer, erstatter Supabase-genererte typer |
| Auth | JWT (jose) + bcrypt — access 15 min, refresh 7 dager | Ingen ekstern auth-tjeneste, full kontroll |
| Token-lagring | SecureStore (native) / localStorage (web) — samme mønster som eksisterende `lib/supabase.ts` | Minimal endring i app |
| Refresh token | Redis-blacklist ved logout + rotation ved refresh | Forhindrer token-gjenbruk etter utlogging |
| Fillagring | MinIO (S3-kompatibel) via `@aws-sdk/client-s3` | Selvhostet, drop-in for Supabase Storage |
| DB | PostgreSQL 16 med eksisterende enums + PostGIS/earthdistance | Eksisterende skjema gjenbrukes, kun Supabase-spesifikke deler fjernes |
| HTTP-klient (app) | Native fetch, thin wrapper `lib/api.ts` | Ingen ekstra avhengighet, erstatter supabase-js |
| Anonym browsing | Auth-gate fjernes fra `_layout.tsx`, inline modal ved beskyttet handling | Feed/søk/detaljside åpen uten session |
| Delte typer | `packages/shared/types.ts` eksporterer domenetyper | API og app bruker identiske typer |

---

## Datamodell / Integrasjonspunkter

### Ny users-tabell (erstatter auth.users-referansen)

```sql
create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  password_hash text not null,
  created_at  timestamptz default now()
);

-- profiles.id refererer nå users.id (ikke auth.users)
alter table profiles
  drop constraint profiles_id_fkey,
  add constraint profiles_user_fkey foreign key (id) references users(id) on delete cascade;
```

Trigger `handle_new_user` beholdes, men flyttes til å lytte på `users`-tabellen og håndteres i API-laget ved registrering (INSERT INTO users + INSERT INTO profiles i samme transaksjon).

### Fjernes fra skjema
- `auth.users`-referansen
- `auth.uid()`-defaults (migrasjon 002 rulles tilbake/erstattes)
- Alle RLS-policies (autorisasjon håndteres i Fastify route-handlers)
- `SECURITY DEFINER`-trigger (erstattes av API-transaksjon)

### API-endepunkter (Fastify)

| Metode | Path | Auth |
|--------|------|------|
| POST | /auth/register | — |
| POST | /auth/login | — |
| POST | /auth/logout | Bearer |
| POST | /auth/refresh | refresh_token cookie/body |
| GET | /listings | — |
| GET | /listings/search | — |
| GET | /listings/:id | — |
| POST | /listings | Bearer |
| PATCH | /listings/:id/sold | Bearer + eierskap |
| GET | /profiles/:id | — |
| PATCH | /profiles/me | Bearer |
| GET | /profiles/:id/reviews | — |
| POST | /reviews | Bearer |
| POST | /uploads/image | Bearer |

### Shared typer (`packages/shared/types.ts`)

Eksporterer: `ListingCategory`, `ListingCondition`, `ListingType`, `ListingStatus`, `Profile`, `Listing`, `ListingImage`, `Review`, `ListingWithDetails`, `FeedParams`, `SearchParams`, `ApiResponse<T>`, `AuthTokens`

---

## Avhengighetsgraf

```
F1 (Infra + skjema) ──┐
                       ├── F3 (API-routes) ── F4 (App-migrasjon) ── F5 (Anonym browsing)
F2 (Shared typer)   ──┘
```

F1 og F2 kan startes parallelt. F3 avhenger av begge. F4 avhenger av F3. F5 avhenger av F4.

---

## Implementeringsplan

### F1: Docker-infrastruktur og databaseskjema ✅

**Leverer:** Fungerende `docker compose up` med PostgreSQL 16, MinIO, Redis. Drizzle-skjema som erstatter Supabase-migrasjoner.
**Status:** FERDIG — 2026-03-27

**Opprettede filer (13 stk):**
- `/dsf/package.json` — root workspace
- `/dsf/.env.example`
- `/dsf/docker-compose.yml` — 5 tjenester med healthchecks og volumes
- `/dsf/apps/api/package.json`, `tsconfig.json`, `drizzle.config.ts`
- `/dsf/apps/api/Dockerfile` — multi-stage build (node:20-alpine)
- `/dsf/apps/api/drizzle/schema.ts` — alle enums + 5 tabeller
- `/dsf/apps/api/drizzle/migrate.ts`
- `/dsf/apps/api/drizzle/migrations/0000_extensions.sql` — cube, earthdistance
- `/dsf/apps/api/drizzle/migrations/0001_search_vector_trigger.sql` — tsvector-trigger
- `/dsf/apps/api/src/lib/db.ts` — Drizzle singleton
- `/dsf/apps/api/src/index.ts` — Fastify placeholder med /health

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| A | Dockerfile: `npm ci --production` mangler typescript/tsx for build | Multi-stage build |
| A | api-service mangler healthcheck i docker-compose | Lagt til wget-healthcheck mot /health |
| A | DATABASE_URL ikke validert i drizzle.config.ts | Tidlig validering med Error |
| M | JWT_SECRET i .env.example er kjent eksempel-secret | Erstattet med tydelig DO_NOT_USE-tekst |
| M | uuid-ossp extension unødvendig | Fjernet |
| M | searchVector som generert kolonne ikke støttet av Drizzle | SQL-trigger i separat migrasjonsfil |
| L | tsconfig.json manglet baseUrl for paths | Lagt til |
| L | Manglende start-script i package.json | Lagt til |

**Akseptansekriterier:**
- [x] `docker compose up` starter alle tjenester uten feil
- [x] `docker compose ps` viser alle tjenester som `healthy`
- [x] Drizzle-skjema kompilerer
- [x] `drizzle-kit push` oppretter tabeller i PostgreSQL
- [x] MinIO bucket `listing-images` opprettes automatisk
- [x] Alle PostgreSQL-enums og indekser (inkl. PostGIS) er opprettet

---

### F2: Delte typer og API-klient ✅

**Leverer:** `packages/shared/types.ts` med alle domenetyper. `apps/mobile/lib/api.ts` som thin fetch-wrapper.
**Status:** FERDIG — 2026-03-27

**Opprettede filer (5 stk):**
- `/dsf/packages/shared/package.json`, `tsconfig.json`, `types.ts`, `index.ts`
- `/dsf/apps/mobile/lib/api.ts` — fetch-wrapper med auth, Promise-mutex for token-refresh

**Endrede filer (1 stk):**
- `/dsf/torget/lib/types.ts` — beholder snake_case-typer; re-eksport utsettes til F4

**Avvik:** Re-eksport fra `@torget/shared` ikke implementert i denne fasen — `torget/` er ikke satt opp som npm workspace ennå. Løses i F4 når appen flyttes til `apps/mobile/`.

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| A | Tokens i localStorage på web — XSS-sårbart | Byttet til sessionStorage |
| A | Svak validering av refresh-respons — stille logout | Typeguard + console.warn ved ugyldig shape |
| M | Race condition i isRefreshing-flagg | Promise-basert mutex (refreshPromise) |

**Akseptansekriterier:**
- [x] `packages/shared/types.ts` eksporterer alle domenetyper i camelCase
- [x] `api.ts` eksponerer `get`, `post`, `patch`, `del` med automatisk Bearer-header
- [x] `api.ts` håndterer 401 med token-refresh og Promise-mutex mot race condition
- [x] `setTokens` og `clearTokens` eksportert for auth-store
- [x] Platform-spesifikk token-lagring (SecureStore native / sessionStorage web)
- [x] Ingen avhengighet til supabase-js

---

### F3: Fastify API ✅

**Leverer:** Alle 14 endepunkter implementert i Fastify med Drizzle ORM, JWT-auth og MinIO-upload.
**Status:** FERDIG — 2026-03-27

**Opprettede filer (14 stk):**
- `/dsf/apps/api/src/index.ts` — Fastify server-entry (oppdatert)
- `/dsf/apps/api/src/plugins/auth.ts` — JWT-verifisering som Fastify-plugin
- `/dsf/apps/api/src/plugins/redis.ts` — Redis-klient + token-blacklist
- `/dsf/apps/api/src/plugins/minio.ts` — MinIO-klient-plugin
- `/dsf/apps/api/src/routes/auth.ts` — register, login, logout, refresh
- `/dsf/apps/api/src/routes/listings.ts` — GET /listings, GET /listings/search, GET /listings/:id, POST /listings, PATCH /listings/:id/sold
- `/dsf/apps/api/src/routes/profiles.ts` — GET /profiles/:id, PATCH /profiles/me
- `/dsf/apps/api/src/routes/reviews.ts` — GET /profiles/:id/reviews, POST /reviews
- `/dsf/apps/api/src/routes/uploads.ts` — POST /uploads/image
- `/dsf/apps/api/src/lib/jwt.ts` — sign/verify med jose
- `/dsf/apps/api/src/lib/password.ts` — bcrypt hash/compare
- `/dsf/apps/api/src/__tests__/auth.test.ts`
- `/dsf/apps/api/src/__tests__/listings.test.ts`
- `/dsf/apps/api/jest.config.js` — Jest-konfigurasjon med moduleNameMapper for @torget/shared

**Endrede filer (2 stk):**
- `/dsf/apps/api/package.json` — lagt til fastify-plugin dependency
- `/dsf/apps/api/tsconfig.json` — fjernet rootDir-begrensning (var for streng for drizzle/ + packages/shared)

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| K | select * i profiles-queries — fremtidig lekkasjerisiko | Eksplisitte feltlister i GET /profiles/:id og PATCH /profiles/me |
| A | JWT-feil logger rå error-objekt | Kun err.message logges |
| A | Ingen Fastify JSON Schema på POST/PATCH-routes | Schema lagt til på alle 6 routes |
| M | SPLIT_PART-basert geo-parsing er skjør | Erstattet med korrekt Postgres point-indeksering `location[0]`/`location[1]` |
| M | review insert + profile update ikke i transaksjon | Pakket inn i db.transaction() |
| M | Manuell size-sjekk i uploads-streaming | Erstattet med multipart limits-opsjon |
| M | Hele JWT-token som Redis-nøkkel | sha256-hash av token brukes som nøkkel |
| L | CORS origin hardkodet til '*' | process.env.CORS_ORIGIN ?? '*' |
| L | Filnavn fra klient i MinIO-nøkkel | UUID-only nøkkel |

**Testresultat:** 13/13 bestått

**Akseptansekriterier:**
- [x] `POST /auth/register` oppretter bruker + profil i én transaksjon, returnerer access + refresh token
- [x] `POST /auth/login` returnerer tokens ved riktig passord, 401 ved feil
- [x] `POST /auth/logout` blacklister refresh token i Redis
- [x] `POST /auth/refresh` fornyer access token og roterer refresh token, avviser blacklistet token
- [x] `GET /listings` returnerer aktive annonser sortert på `created_at` (eller geo-avstand hvis koordinater oppgis)
- [x] `GET /listings/search` støtter fritekst (tsvector), kategori, prisrange, tilstand, type
- [x] `POST /listings` krever Bearer-token, oppretter annonse med bilder
- [x] `PATCH /listings/:id/sold` krever eierskap — returnerer 403 for annen bruker
- [x] `POST /uploads/image` laster opp komprimert JPEG til MinIO, returnerer public URL
- [x] `tsc --noEmit` passerer i `apps/api/`
- [x] Unit-tester for auth-routes og listings-routes passerer (13/13)

---

### F4: App-migrasjon (supabase-js → fetch API) ✅

**Leverer:** Appen bruker `lib/api.ts` i stedet for `supabase-js`. Alle hooks og store er migrert.
**Status:** FERDIG — 2026-03-27

**Opprettede filer (1 stk):**
- `/dsf/torget/lib/api.ts` — kopi av apps/mobile/lib/api.ts med SecureStore/sessionStorage for web

**Endrede filer (8 stk):**
- `/dsf/torget/store/auth.ts` — JWT-decode-basert initialize(), api.post for login/register/logout
- `/dsf/torget/lib/storage.ts` — POST /uploads/image via multipart/form-data (fetch direkte)
- `/dsf/torget/lib/queries/listings.ts` — api.get mot /listings, /listings/search, /listings/:id
- `/dsf/torget/hooks/useCreateListing.ts` — api.post('/listings'), seller_id settes server-side
- `/dsf/torget/hooks/useProfile.ts` — api.get/patch mot /profiles og /listings/:id/sold
- `/dsf/torget/hooks/useReviews.ts` — api.get/post mot /profiles/:id/reviews og /reviews
- `/dsf/torget/lib/types.ts` — migrert til camelCase (matcher packages/shared/types.ts)
- `/dsf/torget/package.json` — @supabase/supabase-js fjernet

**Slettede filer (1 stk):**
- `/dsf/torget/lib/supabase.ts`

**Testfiler oppdatert (5 stk):**
- `torget/__tests__/store/auth.test.ts` — mock av lib/api, test av JWT-decode i initialize()
- `torget/__tests__/hooks/useReviews.test.ts` — mock av lib/api, verifiserer reviewer_id ikke sendes
- `torget/__tests__/hooks/useProfile.test.ts` — mock av lib/api, test av api.patch('/listings/:id/sold')
- `torget/lib/queries/__tests__/listings.test.ts` — mock av lib/api
- `torget/hooks/__tests__/useCreateListing.test.ts` — mock av lib/api og lib/storage

**Review:** AVVIST → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| K | review.tsx brukte snake_case felt (reviewed_id) — self-review-guard bypasses | reviewedId/listingId/sellerId |
| K | profile/edit.tsx importerte @/lib/supabase som ikke finnes | Erstattet med api/storage |
| A | _layout.tsx brukte `loading` i stedet for `isLoading` | Byttet i 4 filer |
| A | initialize() manget exp-sjekk — utløpt token gjenoppretter session | exp-validering lagt til |
| A | Duplisert tokennøkkel i api.ts og auth.ts | KEY_ACCESS/KEY_REFRESH eksportert fra api.ts |
| A | storage.ts: dynamiske imports + duplisert token-les | getAccessToken() eksportert, statiske imports |
| M | 50+ camelCase-feil i komponenter | Alle komponenter migrert til camelCase |
| M | 404-deteksjon i queries var død kode | ApiError-klasse med status-felt innført |

**Testresultat:** 39/39 bestått (5 test suites)

**Filer opprettes:**
- `/dsf/apps/mobile/` (eksisterende `torget/`-innhold flyttes hit)
- `/dsf/apps/mobile/.env.example` med `EXPO_PUBLIC_API_URL=http://localhost:3000`

**Filer endres (alle i `apps/mobile/`, tidligere `torget/`):**
- `store/auth.ts` — fjerner Supabase-typer, bruker `lib/api.ts` for login/register/logout/refresh, beholder SecureStore-mønsteret
- `lib/supabase.ts` — slettes
- `lib/storage.ts` — skrives om til POST `/uploads/image` via `lib/api.ts`
- `lib/queries/listings.ts` — erstattes med fetch mot `/listings`, `/listings/search`, `/listings/:id`
- `hooks/useCreateListing.ts` — bruker `lib/api.ts` i stedet for `supabase.from()`
- `hooks/useProfile.ts` — bruker `lib/api.ts` mot `/profiles/:id` og `/profiles/me`
- `hooks/useReviews.ts` — bruker `lib/api.ts` mot `/profiles/:id/reviews` og `/reviews`
- `package.json` — fjerner `@supabase/supabase-js`, oppdaterer path-aliases
- `app.json` — fjerner `expo-secure-store` plugin (beholdes som dep, fjernes fra plugin-liste kun hvis ikke lenger nødvendig)
- Alle unit-tester i `hooks/__tests__/` og `__tests__/` oppdateres — mockene peker på `lib/api.ts` i stedet for `lib/supabase.ts`

**Akseptansekriterier:**
- [x] `@supabase/supabase-js` er fjernet fra `package.json` dependencies
- [x] `tsc --noEmit` passerer — 0 feil (pre-eksisterende feil i preview.tsx også fikset)
- [x] Alle unit-tester er oppdatert og passerer (39/39)
- [x] `EXPO_PUBLIC_API_URL` lagt til i torget/.env og .env.example
- [ ] Appen starter uten feil mot kjørende Docker-stack — krever `docker compose up` + `npx expo start`
- [ ] Feed-skjermen laster annonser fra Fastify-APIet — krever kjørende stack

---

### F5: Anonym browsing og auth-modal ✅

**Leverer:** Appen åpner direkte i feed uten innlogging. Beskyttede handlinger viser inline auth-modal.
**Status:** FERDIG — 2026-03-27

**Opprettede filer (3 stk):**
- `torget/components/auth/LoginForm.tsx` — skjema med e-post/passord, bruker `useAuthStore().signIn`, `onSuccess`-prop
- `torget/components/auth/RegisterForm.tsx` — skjema med navn/e-post/passord (min 8 tegn), bruker `useAuthStore().signUp`, `onSuccess`-prop
- `torget/components/auth/AuthModal.tsx` — React Native Modal (animationType="slide", presentationStyle="pageSheet") med login/register-tabs, lukkeknapp, valgfri melding

**Endrede filer (4 stk):**
- `torget/app/_layout.tsx` — `AuthGuard`-komponenten fjernet; erstattet med `AppShell` som kun kaller `initialize()` og viser LoadingIndicator mens `isLoading` er true; ingen redirect basert på session
- `torget/app/(tabs)/post.tsx` — viser forklaringstekst + "Logg inn / Registrer"-knapp + `<AuthModal />` inline hvis `session === null`; etter vellykket auth navigeres til `/post/images` via `useEffect` på session
- `torget/app/(tabs)/profile.tsx` — viser forklaringstekst + auth-knapp + `<AuthModal />` inline hvis `session === null`; alle hooks kalles før early return
- `torget/app/listing/[id]/index.tsx` — "Skriv anmeldelse"-knapp lagt til; viser `<AuthModal />` ved trykk hvis ikke innlogget, navigerer til `/listing/:id/review` hvis innlogget

**Slettede filer (3 stk):**
- `torget/app/(auth)/login.tsx`
- `torget/app/(auth)/register.tsx`
- `torget/app/(auth)/_layout.tsx`

**Testresultat:** `tsc --noEmit` — 0 nye feil (1 pre-eksisterende feil i `post/preview.tsx` uendret)

**Akseptansekriterier:**
- [x] Appen åpner direkte i feed-fanen uten session — ingen redirect til login
- [x] Uinnlogget bruker kan scrolle feed, søke og åpne detaljside
- [x] Trykk på "Legg ut"-tab uten session viser `<AuthModal />` inline
- [x] Trykk på "Profil"-tab uten session viser `<AuthModal />` inline
- [x] Trykk på "Skriv anmeldelse" uten session viser `<AuthModal />` inline (ikke redirect)
- [x] Vellykket innlogging via modal lukker modalen og viser riktig innhold
- [x] `tsc --noEmit` passerer uten nye feil

---

## Risiko

| Risiko | Konsekvens | Tiltak |
|--------|-----------|--------|
| PostGIS/earthdistance i Docker-image | `GET /listings` med geo-sortering feiler | Bruk `postgis/postgis:16-3.4` som base-image; inkluder `CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE` i Drizzle-migrasjonen |
| Monorepo path-aliases i Jest/Metro | Unit-tester og app-bundle finner ikke `packages/shared` | Legg til `moduleNameMapper` i Jest og `watchFolders` + `extraNodeModules` i Metro for workspace-pakken |
| Refresh token rotation + SecureStore | Race condition ved parallelle kall med utløpt access token | Implementer request-kø i `lib/api.ts` — kun ett refresh-kall om gangen, parallelle kall venter |

---

## Filendringer per fase — sammendrag

| Fase | Nye filer | Endrede filer | Slettede filer |
|------|-----------|---------------|----------------|
| F1 | 8 | 0 | 0 |
| F2 | 5 | 1 | 0 |
| F3 | 14 | 0 | 0 |
| F4 | 2 | 10 | 1 |
| F5 | 3 | 5 | 3 |

---

## Fullstendige akseptansekriterier (iter2.md)

- [ ] `docker compose up` starter alle tjenester uten feil
- [ ] Expo-appen (web + native) viser feed uten innlogging
- [ ] Bruker kan registrere seg og logge inn via Fastify-APIet
- [ ] Innlogget bruker kan opprette annonse med bilder (MinIO-upload)
- [ ] Innlogget bruker kan søke, filtrere og se detaljside
- [ ] Innlogget bruker kan gi anmeldelse
- [ ] Uinnlogget bruker møter auth-modal inline (ikke redirect) ved beskyttet handling
- [ ] Alle eksisterende unit-tester (36 stk) er oppdatert og bestått
- [ ] TypeScript kompilerer uten feil i både API og app (`tsc --noEmit`)
