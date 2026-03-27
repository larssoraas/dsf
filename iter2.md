# Torget — Iterasjon 2: Selvhostet stack + anonym browsing

**Basert på:** MVP i `torget/` (React Native + Expo SDK 52, TypeScript strict)
**Mål:** Erstatt Supabase cloud med en selvhostet Docker-stack. Fjern innloggingskrav for browsing.

---

## Kontekst for arkitekten

### Eksisterende kodebase
```
torget/
├── app/              # Expo Router — file-based routes
│   ├── (auth)/       # login.tsx, register.tsx
│   ├── (tabs)/       # index (feed), search, post, profile
│   ├── listing/[id]/ # Detaljside + review
│   ├── post/         # Flerstegs annonseskjema
│   └── profile/      # Offentlig profil + redigering
├── hooks/            # useCreateListing, useReviews, useProfile
├── lib/
│   ├── supabase.ts   # Supabase singleton-klient
│   ├── queries/      # listings.ts — fetchFeed, search, fetchById
│   ├── storage.ts    # Bildeopplasting til Supabase Storage
│   └── types.ts      # DB-typer (manuelt vedlikehold)
├── store/auth.ts     # Zustand auth-store (supabase.auth.*)
└── components/       # ListingCard, ListingDetail, FilterSheet, ProfileHeader, ReviewList
```

Hele backend-integrasjonen går gjennom `supabase-js`. Auth, queries og storage må erstattes.

---

## Krav til iterasjon 2

### K1: Docker-basert infrastruktur
- Alt kjøres med `docker compose up` — én kommando, ingen eksterne tjenester
- Tjenester som skal inn i compose:
  - **PostgreSQL 16** med eksisterende skjema (migrasjonene i `supabase/migrations/`)
  - **API-server** — Node.js (Fastify) med TypeScript, erstatter PostgREST + GoTrue
  - **MinIO** — S3-kompatibel objektlagring, erstatter Supabase Storage
  - **Redis** — session-cache og rate limiting
- Expo-appen kjøres fortsatt lokalt med `npx expo start`, men peker mot Docker-API
- Miljøvariabel `EXPO_PUBLIC_API_URL` peker på API-serveren (f.eks. `http://localhost:3000`)

### K2: Erstatt Supabase med egendefinert API
- Fjern `@supabase/supabase-js` og `expo-secure-store` som primær auth-mekanisme
- Ny `lib/api.ts` — thin HTTP-klient (fetch-basert) mot Fastify-APIet
- Autentisering via **JWT** (access token 15 min + refresh token 7 dager i HttpOnly cookie)
- JWT lagres i `SecureStore` på native, `localStorage` på web (samme mønster som nå)
- Alle eksisterende endepunkter implementeres i Fastify:
  - `GET /listings` — feed med geo-sortering (PostGIS) og filtrering
  - `GET /listings/search` — fritekst + filtre
  - `GET /listings/:id` — detaljside
  - `POST /listings` — opprett annonse (krever auth)
  - `PATCH /listings/:id/sold` — merk som solgt (krever auth + eierskap)
  - `GET /profiles/:id` — offentlig profil
  - `PATCH /profiles/me` — rediger profil (krever auth)
  - `GET /profiles/:id/reviews` — hent anmeldelser
  - `POST /reviews` — opprett anmeldelse (krever auth)
  - `POST /auth/register` — registrer bruker
  - `POST /auth/login` — logg inn
  - `POST /auth/logout` — logg ut
  - `POST /auth/refresh` — forny access token
  - `POST /uploads/image` — last opp bilde til MinIO (krever auth)

### K3: Anonym browsing
Brukere skal IKKE møte en innloggingsvegg ved oppstart. Appen åpner direkte i feeden.

**Anonym bruker kan:**
- Se feed (alle aktive annonser)
- Søke og filtrere
- Se alle detaljer på en annonse (bilder, beskrivelse, selgerprofil-snipp, rating)
- Se offentlig profil med anmeldelser

**Krever innlogging (auth-gate vises inline, ikke som redirect):**
- Legge ut annonse
- Skrive anmeldelse
- (V2: sende melding, gi bud)

**Navigasjonsendringer:**
- Fjern `(auth)`-gaten i `app/_layout.tsx` — alle tabs åpne uten session
- Tab-bar: Feed | Søk | Legg ut | Profil
- "Legg ut"-tab: viser innloggingsskjema inline hvis ikke autentisert
- "Profil"-tab: viser innloggingsskjema inline hvis ikke autentisert
- Auth-skjema (login/register) som modal, ikke egen route

### K4: Databaseskjema
- Bruk eksisterende migrasjoner som grunnlag (`supabase/migrations/001_initial_schema.sql`)
- Fjern Supabase-spesifikke elementer:
  - `auth.users`-referansen → eget `users`-tabell i public-schema
  - `auth.uid()`-funksjoner → erstattes av server-side JWT-validering i Fastify
  - RLS-policies → erstattes av autorisasjonslogikk i Fastify route-handlers
  - `SECURITY DEFINER`-triggere → enklere trigger eller håndteres i API-laget
- PostGIS/earthdistance beholdes for geo-sortering

---

## Tekniske føringer

| Tema | Valg | Begrunnelse |
|------|------|-------------|
| API-rammeverk | Fastify v5 + TypeScript | Rask, god plugin-økonomi, native TS-støtte |
| ORM | Drizzle ORM | Type-safe, SQL-nær, fungerer med Postgres + genererer typer |
| Auth | JWT (jose-biblioteket) + bcrypt | Ingen ekstern auth-tjeneste nødvendig |
| Fillagring | MinIO (S3-kompatibel) | Selvhostet, samme SDK som AWS S3 |
| DB-migrasjoner | Drizzle Kit | Kodet med ORM-en, ingen separat migrasjonsstakk |
| HTTP-klient (app) | Native fetch med thin wrapper | Ingen ekstra avhengighet |
| Cache | Redis (ioredis) | Token-blacklist ved logout, rate limiting |
| Monorepo-struktur | `apps/api/` og `apps/mobile/` i rot | Delte typer via `packages/shared/` |

---

## Ikke i scope for iterasjon 2

- Meldingssystem / budfunksjon (V2)
- Vipps-betaling (V3)
- Push-varsler
- BankID-verifisering
- E2E-tester (Playwright) — utsettes til stabil web-URL eksisterer

---

## Akseptansekriterier for ferdig iterasjon 2

- [ ] `docker compose up` starter alle tjenester uten feil
- [ ] Expo-appen (web + native) viser feed uten innlogging
- [ ] Bruker kan registrere seg og logge inn via Fastify-APIet
- [ ] Innlogget bruker kan opprette annonse med bilder (MinIO-upload)
- [ ] Innlogget bruker kan søke, filtrere og se detaljside
- [ ] Innlogget bruker kan gi anmeldelse
- [ ] Uinnlogget bruker møter auth-modal inline (ikke redirect) ved beskyttet handling
- [ ] Alle eksisterende unit-tester (36 stk) er oppdatert og bestått
- [ ] TypeScript kompilerer uten feil i både API og app (`tsc --noEmit`)

---

## Oppstart: slik brukes denne prompten

Send dette dokumentet til arkitektagenten som steg 1 i CLAUDE.md-protokollen:

```
Les .claude/skills/architect/SKILL.md
Les iter2.md (dette dokumentet)
Les torget/-mappestrukturen for å forstå eksisterende kodebase

Lag en faset implementeringsplan for iterasjon 2 i henhold til arkitekt-skill-formatet.
Planen lagres som doc/torget-iter2-plan.md.
```
