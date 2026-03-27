# CLAUDE.md

## Produkt

> **Oppstart:** Fyll ut alle seksjoner under før agentprotokollen tas i bruk.
> Disse verdiene injiseres i architect-, developer- og reviewer-prompts og er
> forutsetningen for at agentene tar riktige valg.

### Produktbeskrivelse

**Torget** — en lokal markedsplass for kjøp, salg og gratis-gis av brukte ting. Mobile-first. Inspirert av finn.no, men enklere, raskere og med lokalt fokus.

Brukere: privatpersoner som vil selge, kjøpe eller gi bort brukte ting i nærheten.

Kjernefunksjoner: annonsering (til salgs / ønskes kjøpt / gis bort gratis), kartsøk, fritekst + filtrering, innebygd meldingssystem med budfunksjon, brukerprofil med anmeldelser, Vipps-betaling.

Posisjonering: *"Det lokale torget — i lomma di."*

### Stack

- **Frontend:** React Native + Expo SDK 52, Expo Router (file-based), TypeScript strict
- **Backend:** Fastify v5 + TypeScript — selvhostet, kjøres i Docker
- **Database:** PostgreSQL 16 med PostGIS (Docker-image: `postgis/postgis:16-3.4`)
- **ORM:** Drizzle ORM + Drizzle Kit
- **Auth:** JWT (jose) — access token 15 min, refresh token 7 dager, Redis-blacklist
- **Fillagring:** MinIO (S3-kompatibel, selvhostet i Docker)
- **Cache:** Redis 7
- **State:** Zustand (UI-state) + TanStack Query (server-state/cache)
- **Søk:** PostgreSQL full-text search (tsvector/websearch) — ingen ekstern søketjeneste
- **Lokasjon:** Expo Location + PostGIS (earthdistance) for nærhet-sortering
- **Bilder:** MinIO via `@aws-sdk/client-s3`, komprimert via expo-image-manipulator
- **Monorepo:** `apps/api/`, `apps/mobile/`, `packages/shared/`

### Designretning

Mobile-first. Enkel, rask annonsering (< 60 sek fra åpne app til publisert). Lokal-fokusert feed. Tillit via anmeldelser og verifiserte profiler.

### Faser

- **MVP** ✅: Annonsering (CRUD), feed, fritekst-søk, brukerprofil (Supabase-basert)
- **Iter2** 🔄: Docker-stack (Fastify + PostgreSQL + MinIO + Redis), anonym browsing uten innlogging
- **V2**: Kartsøk, meldingssystem, budfunksjon
- **V3**: Vipps-betaling, BankID-verifisering, push-varsler

## Utviklingsmodell: Agent-basert

Hovedsamtalen er **orkestrator** — den skriver ingen kode selv, men dispatcher arbeid til agenter via Task-verktøyet og evaluerer resultater.

### Hvorfor agenter?

To grunner, ingen andre:
1. **Kontekstisolering** — frisk kontekst per oppgave, ingen komprimering
2. **Parallellisering** — review og test kjøres samtidig, uavhengige faser implementeres parallelt

Alt annet (sjekklister, kvalitetskrav, tekniske valg) løses med gode instruksjoner i skill-filer — ikke med flere lag av kontroll.

### Kontekstdisiplin

Orkestratoren holder konteksten LEAN:
- Plandokumentet (referanse)
- Sammendrag fra agenter (ikke full output)
- Filstier til endrede filer
- Brukerdialog

---

## Agent-protokoll

### Ny feature

#### Steg 1: Arkitektur og plan

```
1. Les .claude/skills/architect/SKILL.md
2. Task(
     subagent_type: "general-purpose",
     description: "Arkitektur og plan: [kort]",
     prompt: [Architect-skill] + feature-beskrivelse + eksisterende kodestruktur
   )
3. Motta: tekniske valg + faset plan (F1-Fn)
4. Lagre i doc/ (Write)
5. Evaluer planen selv:
   - Er fasene riktig avgrenset (3-5)?
   - Er avhengighetsgrafen korrekt?
   - Er tekniske valg konsistente med eksisterende stack?
   - Er det reelle risikoer som ikke er adressert?
   Juster planen om nødvendig.

6. Oppdater skills (orkestratoren gjør dette med Edit):
   - .claude/skills/developer/SKILL.md:
     * Teknisk stack og versjoner fra planen
     * Prosjektspesifikke kodestandarder og mønstre
     * Funksjonelle krav som påvirker implementeringsvalg
     * Ikke-funksjonelle krav (ytelse, tilgjengelighet, sikkerhet)
   - .claude/skills/reviewer/SKILL.md:
     * Teknologispesifikke sjekkpunkter (f.eks. React-mønstre, API-kontrakter)
     * Sikkerhetskrav fra planen
     * Ytelseskrav og terskelverdier
     * Arkitekturregler som skal håndheves
   - .claude/skills/tester/SKILL.md:
     * Testmiljø og oppstartkommandoer fra planen
     * Kritiske brukerflyter som alltid skal testes
     * Ikke-funksjonelle testkrav (ytelse, tilgjengelighet)
   - .claude/skills/architect/SKILL.md (ved behov):
     * Etablerte mønstre og beslutninger som ikke skal gjenåpnes
   - Andre relevante skills ved behov
   Mål: alle agenter opererer med samme tekniske og funksjonelle kontekst som planen.
   Gå direkte til implementering.
```

Ingen menneskelig godkjenning av plan. Orkestratoren vurderer selv.
Etter ferdig fase: gå AUTOMATISK videre til neste fase. Aldri stopp og vent mellom faser.

#### Steg 2: Implementering per fase

For HVER fase F i planen:

```
2a. IMPLEMENTER
    Les .claude/skills/developer/SKILL.md
    Task(
      subagent_type: "general-purpose",
      description: "Implementer fase F[N]",
      prompt: [Dev-skill]
        + fasebeskrivelse fra plan
        + akseptansekriterier
        + kontekst fra forrige fase (sammendrag, endrede filer, review-funn)
        + "Implementer det denne fasen beskriver. Skriv unit-tester for ny logikk."
    )
    Motta: bekreftelse + liste over endrede filer

2b. KVALITETSKONTROLL (PARALLELT)
    Les .claude/skills/reviewer/SKILL.md
    Les .claude/skills/tester/SKILL.md

    --- To Task-kall i SAMME melding: ---

    Task(
      subagent_type: "general-purpose",
      description: "Review fase F[N]",
      prompt: [Reviewer-skill]
        + endrede filer
        + akseptansekriterier
        + "Les filene og lever verdikt med funn-tabell."
    )

    Task(
      subagent_type: "general-purpose",
      description: "Test fase F[N]",
      prompt: [Tester-skill]
        + akseptansekriterier
        + "Testmiljo: http://localhost:5173"
        + "Start dev-server: npx vite --port 5173"
        + "Skriv E2E-tester og kjor smoke test. Lever resultatrapport."
    )

    --- Motta begge resultater ---

2c. EVALUER
    Begge OK -> oppdater plan, neste fase
    Review AVVIST -> Task(Dev, fiks funn) -> tilbake til 2b
    Test feilet -> Task(Dev, fiks feil) -> tilbake til 2b

2d. OPPDATER PLAN — OBLIGATORISK før neste fase starter (orkestratoren med Edit)
    - Status og dato
    - Liste over alle endrede filer
    - Review-funn (tabell: alvorlighet, beskrivelse, løsning)
    - Testresultat (X/Y bestått)
    - Alle akseptansekriterier huket av
```

#### Steg 3: Integrasjon og commit

Kjøres automatisk etter siste fase — ingen pause eller bruker-godkjenning.

```
1. Kjør npx vitest run + npx playwright test — verifiser at alle faser fungerer sammen
2. Oppdater plan med endelig status (Edit)
3. Temabaserte commits — én commit per logisk tema
```

#### Steg 4: Analyse og prosessforbedring

```
1. Samle metrikker (timing, linjetall, testdekning, review-funn)
2. Skriv analyse til doc/[fase]-analyse.md:
   - Timing-tabell med sammenligning mot forrige kjøring
   - Kodebase-metrikker (filer, linjer, test-til-kode-ratio)
   - Review-analyse (funn per fase, vanligste typer)
   - Test-analyse (dekning, stale-tester)
   - Hva fungerte / hva kan forbedres
   - Konkrete tiltak for neste fase
3. IMPLEMENTER forbedringstiltak:
   - Analyser review-funn: hvilke typer feil gjentas?
   - Oppdater dev-sjekklisten i .claude/skills/developer/SKILL.md
     med nye punkter som ville fanget gjentatte funn
   - Oppdater reviewer-sjekklisten i .claude/skills/reviewer/SKILL.md
     med nye verifiseringspunkter
   - Oppdater tester-instruksjoner i .claude/skills/tester/SKILL.md
     med lærdommer om stale tester, edge cases etc.
   - Dokumenter endringene i analysen under "Prosessforbedringer implementert"
4. Presenter sammendrag til bruker
```

> **Selvjusterende sjekklister:** Dette steget lukker feedback-loopen.
> Review-funn som dev burde fanget selv → nytt punkt i dev-sjekklisten.
> Test-funn som review burde fanget → nytt punkt i reviewer-sjekklisten.
> Målet er å redusere fiks-raten for hver fase.

### Enkel endring (< 150 linjer, < 3 filer)

```
Task(Dev, endringsbeskrivelse)
Task(Reviewer, endrede filer)
OK -> commit
```

---

## Skill-katalog

4 skills i `.claude/skills/`. Ned fra 6 — PO er kuttet, security er slatt inn i reviewer.

| Skill | Bruk | Injiseres i |
|-------|------|-------------|
| architect | Arkitektur + plan (kombinert) | Steg 1 |
| developer | Implementering + unit-tester | Steg 2a |
| reviewer | Code review + sikkerhet | Steg 2b |
| tester | E2E-tester + smoke test | Steg 2b |

### Nøkkelendringer fra subagent-modellen

| Før (subagent) | Nå (agent) | Grunn |
|----------------|------------|-------|
| 6 roller | 4 roller | PO var rubber stamp, security overlappet review |
| SA + Dev planlegger separat | Architect gjor begge | Kutt overhead, SA-analyser var overdimensjonerte |
| Dev skriver aldri tester | Dev skriver unit-tester | Separasjonen ga null beviselig kvalitetseffekt |
| 8-fase-planer | 3-5 faser | Overengineered for prosjektets storrelse |
| Test gir formelt verdikt | Test rapporterer resultater | Verdiktet sa alltid GODKJENT (22/22 faser) |
| Detaljerte akseptansekriterier (4 kategorier) | Kun funksjonelle kriterier | Ytelse/a11y/sikkerhet dekkes av dev-sjekklisten |

---

## Kvalitetsporter

| Port | Kontroller | Type | Blokkerer |
|------|-----------|------|-----------|
| Orkestrator evaluerer plan | Orkestrator | Agent | Steg 2 |
| Code review | Review-agent | Agent | Neste fase |
| E2E + smoke test | Test-agent | Agent | Neste fase |

Tre porter, alle agent-drevne. Ingen menneskelig godkjenning mellom steg.

---

## Ufravikelige regler

- **ALDRI implementer noe over 150 linjer uten plan** (orkestratoren evaluerer planen selv)
- **ALDRI la orkestratoren skrive kode selv** — all kode via agenter
- **ALLTID oppdater plandokumentet etter hver fase** — med status, endrede filer, review-funn og testresultat. Gjøres FØR neste fase starter. Ufravikelig.
- **ALLTID kjor review og test parallelt**

---

## Timing

Mål tid for alle steg med `date +%s`. Presenter tabell etter fullført pipeline.

| Steg | Varighet | Kommentar |
|------|----------|-----------|
| Arkitektur + plan | Xs | — |
| F1: Implementering | Xs | — |
| F1: QA (review+test) | Xs | parallelt |
| F1: Fiks-runde N | Xs | [grunn] |
| ... | | |
| Totalt (ekskl. ventetid) | Xs | — |

---

## Kommandoer

```bash
# Docker
docker compose up -d              # Start alle tjenester (postgres, api, minio, redis)
docker compose down               # Stop alle tjenester
docker compose logs -f api        # Følg API-logger

# API (apps/api/)
npm run dev --workspace=apps/api  # Start API med hot reload
npm run migrate --workspace=apps/api  # Kjør DB-migrasjoner
npm test --workspace=apps/api     # Kjør API-tester

# Mobilapp (apps/mobile/ etter F4, torget/ nå)
cd apps/mobile && npx expo start        # Start Expo dev-server
cd apps/mobile && npx expo start --ios  # Start på iOS simulator
cd apps/mobile && npx expo start --android # Start på Android emulator
cd torget && npx expo start             # Start fra eksisterende plassering (før F4)

# Testing og typesjekk
npm test --workspace=apps/api         # API unit-tester
cd torget && npx jest --watchAll=false # App unit-tester (før F4)
cd apps/api && npx tsc --noEmit       # TypeScript typesjekk (API)
cd torget && npx tsc --noEmit         # TypeScript typesjekk (app, før F4)

# Drizzle
cd apps/api && npx drizzle-kit generate  # Generer migrasjoner fra skjema
cd apps/api && npx drizzle-kit push      # Push skjema direkte til DB (dev)
cd apps/api && npx drizzle-kit studio    # Drizzle Studio (DB-utforsker)
```
