# Torget — Dark Software Factory

Dette repoet er bygget med en agent-basert utviklingsmodell der Claude Code orkestrerer all implementering, review og testing automatisk — fra idé til ferdig kode uten menneskelig inngripen mellom fasene.

---

## Hva er Dark Software Factory?

Dark Software Factory er et prinsipp lånt fra industriell automasjon: en fabrikk som kjører i mørket — uten mennesker på gulvet. Overført til software: en utviklingspipeline der AI-agenter tar seg av arkitektur, implementering, code review og testing sekvensielt og parallelt, mens mennesket setter mål og evaluerer resultater.

I dette prosjektet betyr det:
- Orkestratoren (denne Claude Code-sesjonen) skriver **aldri kode selv**
- All kode produseres av spesialiserte agenter via `Agent`-verktøyet
- Review og testing kjøres **parallelt** etter hver fase
- Agenter fikser funn fra review og går videre til neste fase **automatisk**

---

## Struktur

```
dsf/
├── CLAUDE.md                    # Orkestratorkonfigurasjon — produkt, stack, agent-protokoll
├── iter2.md                     # Kravspec for iterasjon 2 (inngangsport til ny kjøring)
├── .claude/
│   └── skills/                  # Skill-filer injisert i agenter
│       ├── architect/SKILL.md   # Arkitektur og planlegging
│       ├── developer/SKILL.md   # Implementering + unit-tester
│       ├── reviewer/SKILL.md    # Code review + sikkerhet
│       └── tester/SKILL.md      # E2E-tester + smoke test
├── doc/
│   ├── torget-mvp-plan.md       # MVP-plan med status per fase
│   ├── torget-iter2-plan.md     # Iter2-plan med status per fase
│   └── torget-mvp-analyse.md    # Sluttanalyse etter MVP
├── apps/
│   ├── api/                     # Fastify API (iter2)
│   └── mobile/                  # React Native app (under migrasjon fra torget/)
├── packages/
│   └── shared/                  # Delte TypeScript-typer
└── torget/                      # Original React Native app (MVP)
```

---

## Agent-protokollen

Definert i `CLAUDE.md`. Tre steg per feature:

### Steg 1: Arkitektur og plan
```
Architect-agent leser kodebase + kravspec
→ Lager faset plan (3-5 faser) med avhengighetsgraf
→ Orkestratoren evaluerer og lagrer plan til doc/
→ Skills oppdateres med tekniske valg fra planen
```

### Steg 2: Implementering per fase
```
For hver fase F:
  Developer-agent implementerer + skriver unit-tester
  ↓
  Reviewer-agent + Tester-agent (PARALLELT)
  ↓
  Funn? → Developer-agent fikser → tilbake til review
  OK?   → Plan oppdateres → neste fase
```

### Steg 3: Integrasjon og commit
```
Alle tester kjøres
Plan oppdateres med endelig status
Temabaserte commits
```

### Steg 4: Analyse og prosessforbedring
```
Timing-tabell, kodebase-metrikker, review-analyse
Skill-sjekklistene oppdateres med gjentatte funn
→ Neste iterasjon starter med bedre utgangspunkt
```

---

## Skills

Fire filer i `.claude/skills/`. Injiseres i agenter via prompts.

| Skill | Formål | Innhold |
|-------|--------|---------|
| `architect` | Tekniske valg + faset plan | Etablerte beslutninger, leveranseformat |
| `developer` | Implementering + unit-tester | Sjekklistier: feilhåndtering, React Native, Fastify, Supabase/PostgreSQL |
| `reviewer` | Code review + sikkerhet | Sjekklistier: JWT/auth, Fastify API, PostgreSQL/Drizzle, React Native |
| `tester` | E2E + smoke test | Oppstartskommandoer, kritiske flyter |

Skills er levende dokumenter — oppdateres etter hver iterasjon med lærdommer fra review-funn.

---

## Slik starter du en ny iterasjon

1. Skriv en kravspesifikasjon (se `iter2.md` som mal)
2. Start ny samtale i Claude Code fra prosjektroten
3. Send prompten fra bunnen av kravspekken:

```
Les .claude/skills/architect/SKILL.md
Les iter2.md  # (eller ny kravspek)
Les eksisterende kodestruktur

Lag en faset implementeringsplan og lagre til doc/[navn]-plan.md
```

Orkestratoren tar det derfra — evaluerer planen, oppdaterer skills, og kjører fasene automatisk.

---

## Kjøre prosjektet

### Forutsetninger
- Docker Desktop installert
- Node.js 20+ (via nvm)
- Expo Go på telefon (for mobilapp)

### Start backend-stack
```bash
cp .env.example .env
# Rediger .env med dine verdier (minst JWT_SECRET)
docker compose up -d
docker compose ps          # Alle tjenester skal vise "healthy"
```

### Start API i dev-modus (hot reload)
```bash
npm install
npm run api                # Tilsvarer: npm run dev --workspace=apps/api
# API tilgjengelig på http://localhost:3000
# Helse: GET http://localhost:3000/health
```

### Start mobilapp
```bash
cd torget                  # Eller apps/mobile/ etter F4
npx expo start
# Trykk w for nettleser, i for iOS, a for Android
# Eller scan QR med Expo Go
```

### Kjør tester
```bash
npm test --workspace=apps/api           # API-tester
cd torget && npx jest --watchAll=false  # App-tester
```

### Database-administrasjon
```bash
cd apps/api
npx drizzle-kit studio     # Åpner Drizzle Studio i nettleser (DB-utforsker)
npx drizzle-kit generate   # Generer ny migrasjon fra skjemaendringer
npx drizzle-kit push       # Push skjema direkte til DB (kun dev)
```

---

## Iterasjonshistorikk

| Iterasjon | Status | Beskrivelse |
|-----------|--------|-------------|
| MVP | ✅ Ferdig | Supabase-basert: auth, annonser, feed, søk, profil, anmeldelser |
| Iter2 | 🔄 Pågår | Docker-stack (Fastify + PostgreSQL + MinIO + Redis), anonym browsing |
| V2 | ⬜ Planlagt | Kartsøk, meldingssystem, budfunksjon |
| V3 | ⬜ Planlagt | Vipps-betaling, BankID-verifisering, push-varsler |

---

## Teknisk stack (Iter2)

| Lag | Teknologi |
|-----|-----------|
| Mobilapp | React Native + Expo SDK 52, Expo Router, TypeScript strict |
| API | Fastify v5, TypeScript strict |
| Database | PostgreSQL 16 med PostGIS (earthdistance) |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | JWT (jose) — access 15 min, refresh 7 dager |
| Fillagring | MinIO (S3-kompatibel) |
| Cache/Auth | Redis 7 — token blacklist |
| State (app) | Zustand (UI) + TanStack Query (server) |
| Containerisering | Docker Compose |
| Monorepo | npm workspaces: apps/*, packages/* |
