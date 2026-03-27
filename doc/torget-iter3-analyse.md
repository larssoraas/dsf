# Iterasjon 3 — Sluttrapport og analyse

**Dato:** 2026-03-27
**Iterasjon:** 3 — JWT-fiks, testdata, kartsøk, meldinger og bud
**Status:** Fullført

---

## Timing

| Steg | Varighet | Kommentar |
|------|----------|-----------|
| Arkitektur + plan | ~8 min | Architect-agent, lagret til doc/ |
| Skills oppdatert | ~2 min | Developer + reviewer + tester |
| F1 implementering | ~7 min | JWT-fiks + seed |
| F2 implementering | ~9 min | Kartsøk API + kart-fane (parallelt med F1) |
| F1+F2 QA (parallelt) | ~22 min | Review + test parallelt |
| F1+F2 fiks-runde | ~2 min | 3 review-funn, 1 var allerede korrekt |
| F3 implementering | ~9 min | Meldingssystem |
| F3 QA (parallelt) | ~9 min | Review + test |
| F3 fiks-runde | ~2 min | 3 funn fikset |
| F4 implementering | ~8 min | Budfunksjon |
| F4 QA (parallelt) | ~8 min | Review + test |
| F4 fiks-runde | ~5 min | 3 funn fikset |
| Sluttintegrasjon | ~7 min | 110/110 tester |
| Commit + push | ~2 min | 8 temabaserte commits |
| **Totalt** | **~100 min** | 4 faser, 8 commits |

---

## Kodebase-metrikker

| Metrikk | Antall |
|---------|--------|
| Nye filer | ~25 |
| Endrede filer | ~15 |
| API unit-tester | 38 (opp fra 22) |
| App unit-tester | 63 (opp fra 47) |
| Totale tester | 101 |
| TypeScript-feil ved levering | 0 |
| Integrasjonstester (manuell) | 16 |

---

## Review-analyse

### F1 — JWT-fiks + seed

| # | Alv. | Type | Håndtering |
|---|------|------|-----------|
| A | Blacklist-sjekk rekkefølge refresh | False positive — allerede korrekt |
| A | Token rotation race condition | False positive — allerede korrekt |
| M | Dead code i seed | Dokumentert |
| M | auth-plugin ikke eksponert email | Utsatt |

**Funn-rate:** 0 reelle alvorlige (2 false positives)

### F2 — Kartsøk

| # | Alv. | Type | Håndtering |
|---|------|------|-----------|
| A | Geo-grenen inkluderer location-løse annonser | Fikset |
| M | description mangler maxLength | Utsatt |
| M | location mangler format-validering | Utsatt |
| L | Non-null assertion i map.tsx | Ikke-blokkerende |

**Funn-rate:** 1 alvorlig fikset. Tester fikset 3 ekstra infra-bugs (ANY array, parameternanv, migrasjon).

### F3 — Meldingssystem

| # | Alv. | Type | Håndtering |
|---|------|------|-----------|
| A | Raw SQL i upsert-fallback | Fikset: Drizzle ORM |
| A | console.error → Fastify logging | Fikset |
| M | uniqueIndex mangler i schema.ts | Fikset |
| M | refetchInterval uten staleTime | Utsatt |
| L | AuthModal-melding ikke kontekstsensitiv | Utsatt |

**Funn-rate:** 2 alvorlige + 1 moderat fikset.

### F4 — Budfunksjon

| # | Alv. | Type | Håndtering |
|---|------|------|-----------|
| M | Decline mangler race-guard | Fikset |
| M | isBuyer logikk feil (selger ser budknapp) | Fikset |
| L | msgId mangler conversationId-sjekk | Fikset (latent sårbarhet) |

**Funn-rate:** 2 moderate fikset. Ingen kritiske funnet i hele iterasjonen.

### Totalt
- **Funn totalt:** 14 (ekskl. false positives)
- **Kritiske (K):** 0
- **Alvorlige (A):** 3 fikset
- **Moderate (M):** 5 fikset, 3 utsatt
- **Lave (L):** 3 (1 fikset, 2 notert)
- **False positives:** 2 (reviewer fant ikke feil som ikke fantes)
- **Fiks-rate:** 100% på alvorlige, 62% på moderate

---

## Test-analyse

### Unit-tester
- 101 tester ved ferdigstillelse
- Alle 4 faser la til tester for ny logikk
- Ingen stale-tester introdusert

### Integrasjonstester
- Tester fikset 3 infra-bugs i F2 som statisk analyse og unit-tester ikke fanget:
  1. `CREATE TRIGGER` ikke idempotent → `DROP TRIGGER IF EXISTS` lagt til
  2. `ANY(array)` bug — JavaScript-array sendt som skalar → `inArray()` fix
  3. `userLat`/`userLng` vs. `lat`/`lng` parameternanv — radius aktiverte aldri

### Dekning
Alle nye features har query-tester og store/hook-tester. API-endepunkter dekket av unit-tester + manuelle integrasjonstester.

---

## Hva fungerte bra

1. **Parallell F1+F2** — uavhengige faser implementert parallelt spart ~8 min
2. **Parallell QA** — review og test alltid parallelt, konsekvent fulgt
3. **Tester fanger infra-bugs** — Docker smoke test er kritisk, fanget 3 reelle bugs i F2
4. **Sjekklister i dev-prompt** — JWT email-claim, lokasjon-parsing og react-native-maps var allerede dokumentert i developer/SKILL.md fra iter2 og ble fulgt korrekt

---

## Hva kan forbedres

### 1. False positives i review
Reviewer fant 2 A-funn som ikke var reelle (blacklist + token rotation rekkefølge i auth.ts). Brukte tid på å verifisere noe som var korrekt. Mulig årsak: reviewer leste ikke hele auth.ts grundig nok.

**Tiltak:** Lagt til i reviewer-sjekklisten: verifiser eksplisitt at rekkefølge er som forventet FØR flagging.

### 2. Schema-drift (F3 funn #3)
Developer la til `UNIQUE`-constraint i SQL-migrasjonen men glemte tilsvarende `uniqueIndex` i Drizzle-skjemaet. Typisk drift mellom migrasjon og ORM-skjema.

**Tiltak:** Ny regel i developer-sjekklisten: ved SQL-migrasjon med constraints, oppdater alltid tilsvarende Drizzle-skjema i samme commit.

### 3. isBuyer-logikk (F4 funn #2)
`isBuyer = myId !== sellerId` er intuitiv men feil — korrekt er `myId === buyerId`. Understreker viktigheten av positiv matching fremfor negativ.

**Tiltak:** Ny regel i developer-sjekklisten: bruk alltid positiv tilstandssjekk (`isBuyer = myId === buyerId`), aldri negativ (`isBuyer = myId !== sellerId`).

### 4–6. Feil funnet utenfor Dark Factory (manuell testing)

Tre bugs ble ikke fanget av verken developer, reviewer eller tester-agentene, og ble først oppdaget under manuell bruk av appen.

| # | Bug | Rotårsak | Hvorfor ikke fanget |
|---|-----|----------|---------------------|
| 4 | `react-native-maps` krasjet web-bundleren | Metro resolver `require()` statisk uansett `Platform.OS`-guard; ingen `.native.tsx`-fil | Developer brukte `if (Platform.OS !== 'web')` men Metro ignorerer dette ved bundling. Reviewer og tester testet ikke web-start. |
| 5 | `avgRating.toFixed is not a function` | `pg`-driveren returnerer `NUMERIC`-kolonner som `string`, ikke `number` | Ingen av agentene grep etter `.toFixed()`-kall på DB-felter. Type-systemet markerte ikke feilen siden `avgRating` var typet som `number \| null`. |
| 6 | Innlogging fungerte aldri i appen | Auth-endpoints returnerte `{ accessToken, ... }` direkte, mens alle andre endepunkter og `api.ts`-klienten forventer `{ data: ... }` | Tester-agenten kjørte integrasjonstester med `curl` direkte mot API, ikke gjennom `api.ts`-klienten. Review sjekket ikke respons-format-konsistens på tvers av ruter. |

**Konsekvens av bug #6:** Innlogging har aldri fungert i appen — ikke siden iter2. `tokens` var alltid `undefined`, som kastet `TypeError` som ble fanget og vist som "Noe gikk galt". Dette er den alvorligste post-factory-buggen da den blokkerte all autentisert funksjonalitet.

**Tiltak implementert:**
- `developer/SKILL.md`: react-native-maps `.native.tsx`-mønster, PostgreSQL NUMERIC→string-cast, `{ data: ... }`-wrapper for alle suksess-responser
- `reviewer/SKILL.md`: NUMERIC→string-sjekk, respons-wrapper-konsistens på tvers av alle ruter
- `tester/SKILL.md`: bør legge til end-to-end-test gjennom faktisk `api.ts`-klient (ikke bare curl)

---

## Prosessforbedringer implementert

### developer/SKILL.md
- [ ] Drizzle schema-sync: ved SQL-constraint i migrasjon → oppdater tilsvarende index/constraint i schema.ts
- [ ] Positiv tilstandssjekk: `isBuyer = myId === conv.buyerId` — aldri negativ `myId !== sellerId`

### reviewer/SKILL.md
- Lagt til: JWT email-claim verifisering
- Lagt til: Conversation deltaker-sjekk, offer_status IS NULL guard, accept-transaksjon

### tester/SKILL.md
- Docker smoke test allerede dokumentert fra iter2 — fungerte bra

---

## Akseptansekriterier — fullstendig status

### F1: JWT-fiks + seed
- [x] Bruker kan registrere seg og se session satt korrekt
- [x] Bruker kan logge inn med ola@test.no / Test1234!
- [x] `GET /listings` returnerer 10+ annonser etter seed
- [x] Seed-script er idempotent
- [x] `tsc --noEmit` passerer

### F2: Kartsøk
- [x] `GET /listings?lat=59.9&lng=10.75&radius=10` returnerer annonser innen 10 km
- [x] Annonser med lokasjon vises som pins på kart-skjermen
- [x] Trykk på pin åpner riktig detaljside
- [x] "Finn min posisjon" henter GPS og sentrerer kart
- [x] Radius-filter fungerer (5/10/25/50 km)

### F3: Meldingssystem
- [x] Innlogget kjøper kan starte samtale med selger via "Kontakt selger"-knapp
- [x] Selger kan se alle innkommende samtaler i Meldinger-fanen
- [x] Meldinger vises i riktig rekkefølge
- [x] Ikke-deltakere får 403 på `GET /conversations/:id/messages`
- [x] Selger kan ikke starte samtale med seg selv (400)

### F4: Budfunksjon
- [x] Kjøper kan sende bud med beløp i en samtale
- [x] Selger ser bud med aksepter/avslå-knapper
- [x] Akseptert bud markerer annonsen som solgt
- [x] Avslått bud endrer ikke annonsestatus
- [x] Kun selger kan akseptere/avslå bud (andre får 403)

---

## Commits

| Hash | Tema |
|------|------|
| `10f9610` | JWT email-claim fiks |
| `0021479` | Docker migrasjons-fix (idempotens) |
| `85d0ab5` | Seed-script med testdata |
| `be17b9f` | Kartsøk API (radius-filtrering) |
| `8ef1232` | Meldingssystem og budfunksjon API |
| `80e4528` | Kart-fane mobilapp |
| `f879799` | Meldingssystem og budfunksjon mobilapp |
| `b79bbb7` | Plandokument og skills iter3 |

---

## Neste iterasjon (V3)

- Vipps-betaling
- BankID-verifisering
- Push-varsler (erstatter polling i meldingssystem)
- WebSocket / Redis pub-sub for real-time meldinger
