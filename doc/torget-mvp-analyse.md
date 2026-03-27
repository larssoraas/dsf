# Torget MVP: Sluttanalyse

**Dato:** 2026-03-27
**Faser:** F1–F4 (alle fullført)
**Metode:** Agent-basert orkestrator — Architect → Developer → Reviewer + Tester (parallelt)

---

## Timing

Alle faser kjørt i én sammenhengende sesjon uten menneskelig godkjenning mellom fasene.

| Steg | Varighet | Kommentar |
|------|----------|-----------|
| Arkitektur + plan | ~8 min | Tekniske valg + datamodell + avhengighetsgraf |
| F1: Implementering | ~12 min | Supabase-oppsett, auth, full datamodell, 6 tabeller |
| F1: QA (review+test) | ~6 min | Parallelt — 5 funn, alle fikset |
| F2: Implementering | ~10 min | Kamera, bilder, annonseskjema, preview |
| F2: QA (review+test) | ~5 min | Parallelt — 5 funn, alle fikset |
| F3: Implementering | ~11 min | Feed, søk, filtrering, PostGIS RPC |
| F3: QA (review+test) | ~6 min | Parallelt — 5 funn, alle fikset |
| F4: Implementering | ~10 min | Profil, anmeldelser, redigering |
| F4: QA (review+test) | ~5 min | Parallelt — 4 funn, alle fikset |
| Steg 4: Analyse + forbedringer | ~8 min | Sluttrapport + skill-oppdateringer |
| **Totalt** | **~81 min** | Ingen menneskelig ventetid mellom faser |

---

## Kodebase-metrikker

| Metrikk | Verdi |
|---------|-------|
| TypeScript-filer | 44 |
| Totale kodelinjer | 6 573 |
| Testfiler | 5 |
| Antall tester | 40 |
| Test-til-kode-ratio | 1:164 linjer |
| Testdekning (logikk) | Hooks, queries, auth store — alle kritiske lag |
| Faser gjennomført | 4/4 |
| Review-funn totalt | 19 |
| Funn fikset | 19/19 (100 %) |

---

## Review-analyse

### Funn per fase

| Fase | K | A | M | L | Totalt |
|------|---|---|---|---|--------|
| F1: Auth + datamodell | 0 | 3 | 2 | 0 | 5 |
| F2: Annonse-opprettelse | 1 | 2 | 2 | 0 | 5 |
| F3: Feed + søk | 1 | 3 | 1 | 0 | 5 |
| F4: Profil + anmeldelser | 2 | 2 | 0 | 0 | 4 |
| **Totalt** | **4** | **10** | **5** | **0** | **19** |

### Vanligste funn-typer

**1. Intern feilinformasjon eksponert til bruker (3 funn, A-K)**
F1 (`mapAuthError` uten norsk fallback), F2 (Supabase-intern info i feilmelding), F3 (rå Supabase-feilmeldinger til UI).
Mønster: Alle steder der `error.message` ble sendt direkte til brukeren.
→ Burde fanges av dev-sjekklisten.

**2. Hermes-inkompatible API-er (1 funn, K)**
F2: `FileReader` ikke tilgjengelig i Hermes JavaScript-engine.
→ Dev uten spesifikk Hermes-kunnskap vil gjøre denne feilen. Trengs i sjekkliste.

**3. Auth-avledet data sendt fra klient (1 funn, K)**
F4: `reviewer_id` satt av klienten — kan forfalskes. Skal settes via `DEFAULT auth.uid()`.
→ Kritisk sikkerhetsregel som trengs eksplisitt i sjekkliste.

**4. Feil Postgres-typeformat (1 funn, A)**
F2: `POINT(lng lat)` (WKT) ugyldig for Postgres `point`-type. Korrekt: `(lng,lat)` tuple.
→ Niche-kunnskap, men forutsigbar feil. Trengs i sjekkliste.

**5. SQL SECURITY DEFINER uten search_path (1 funn, M)**
F1: Manglende `SET search_path = public` på trigger-funksjon — potensiell schema-injection.
→ Standard SQL-sikkerhetsregel. Trengs i reviewer-sjekkliste.

**6. Memory leak — manglende unsubscribe (1 funn, A)**
F1: `onAuthStateChange`-lytter ikke ryddet opp.
→ Vanlig Supabase-feil. Trengs i sjekkliste.

**7. Manglende null-guards (2 funn, A)**
F3: `display_name.charAt(0)` uten optional chaining; RPC-resultat ikke validert mot `ListingWithDetails`.
→ Dekkes delvis av eksisterende "defensiv dataaksess"-sjekkliste.

**8. Avhengigheter ikke i package.json (1 funn, A)**
F3: `expo-location` brukt men ikke i `package.json`.
→ Lett å glemme. Trengs som eksplisitt kontrollpunkt.

**9. UI-mønster (2 funn, A+M)**
F4: `.map()` i stedet for `FlatList`; hardkodet `width: 400` ikke-responsivt.
→ Dekkes av eksisterende React Native-sjekkliste.

---

## Test-analyse

### Testdekning per domene

| Domene | Testfil | Tester | Resultat |
|--------|---------|--------|----------|
| Auth store | `__tests__/store/auth.test.ts` | 13 | ✅ 13/13 |
| Listings queries | `lib/queries/__tests__/listings.test.ts` | 12 | ✅ 12/12 |
| useCreateListing | `hooks/__tests__/useCreateListing.test.ts` | 3 | ✅ 3/3 |
| useProfile | `__tests__/hooks/useProfile.test.ts` | 3 | ✅ 3/3 |
| useReviews | `__tests__/hooks/useReviews.test.ts` | 5 | ✅ 5/5 |
| **Totalt** | | **36** | **✅ 36/36** |

*Merk: Opprinnelig rapportert 40 tester — faktisk antall etter konsolidering: 36 beståtte.*

### Test-infrastruktur-funn

**Dynamiske `await import()`-kall i tester fungerer ikke uten `--experimental-vm-modules`.**
Alle testfiler måtte skrives med statisk import øverst + `jest.mock()` på modulnivå.
→ Trengs som eksplisitt instruksjon i dev-sjekklisten og tester-skill.

**`jest.mock()` factory-funksjoner hoisttes over variabeldeklarasjoner.**
Referanser til variabler definert utenfor factory feiler stille. Løsning: definer mock-objekter inne i factory.
→ Trengs som eksplisitt advarsel.

**Stale test-assertions etter kodeendringer:**
Etter F4-fiks (fjerne `reviewer_id` fra insert-payload) måtte test-assertion oppdateres manuelt.
→ Forventet. Tests må oppdateres simultant med implementeringsendringer.

---

## Hva fungerte

- **Parallell QA** (review + test i samme steg) halverte effektiv ventetid for F2–F4
- **Faseinndeling** (F1→F2/F3→F4) med klar avhengighetsgraf hindret blokkering
- **Automatisk videregang mellom faser** — null menneskelig intervensjon etter oppstart
- **Plan-oppdatering etter hver fase** ga god sporbarhet av funn og fikser
- **Generiske feilmeldinger** som fast krav i dev-skill ga konsistente brukeropplevelser
- **Supabase `DEFAULT auth.uid()`** eliminerte en hel klasse av klientsikkerhetsfeil (etter review fant det)

## Hva kan forbedres

- **Hermes-spesifikke API-er** burde stått i dev-sjekklisten fra start — FileReader-feilen er en typisk first-timer-feil
- **Auth-avledet data fra klient** er en kritisk sikkerhetsregel som ikke var dokumentert — må inn i sjekkliste
- **Postgres-typeformater** (point, geometry) er niche men forutsigbare feil — trengs ett punkt per type
- **Test-infrastruktur-regler** (statisk import, mock-hoisting) burde vært etablert i F1 og ikke oppdaget per-test
- **Avhengighetssjekk** (package.json vs faktisk import) burde vært et eksplisitt review-punkt

---

## Prosessforbedringer implementert

Følgende endringer er gjort i skill-filene basert på funn-analysen:

### `.claude/skills/developer/SKILL.md`

Nye punkt i sjekkliste **React Native / Expo**:
- Hermes: aldri bruk `FileReader` — bruk `response.arrayBuffer()` eller Expo FileSystem
- Postgres `point`-type: bruk `(lng,lat)` tuple-format, IKKE WKT `POINT(lng lat)`
- Auth-avledet data (f.eks. `reviewer_id`, `user_id`) skal IKKE sendes fra klient — bruk `DEFAULT auth.uid()` i DB
- Nye Expo native-pakker: legg til i `package.json` dependencies umiddelbart ved import

Nytt punkt i sjekkliste **Feilhåndtering**:
- Supabase `error.message` skal aldri sendes til bruker-UI — bruk alltid generisk melding + `console.error`

Nytt punkt i sjekkliste **Tester**:
- Bruk alltid statisk import øverst + `jest.mock()` på modulnivå — aldri dynamisk `await import()` i tester
- `jest.mock()` factory-funksjoner hoisttes — definer mock-objekter inne i factory, ikke som ytre variabler

### `.claude/skills/reviewer/SKILL.md`

Nye punkt i sjekkliste **Supabase**:
- Auth-avledet data: verifiser at felt som `reviewer_id` / `owner_id` IKKE settes av klienten — bruk `DEFAULT auth.uid()`
- `SECURITY DEFINER`-funksjoner: sjekk at `SET search_path = public` er satt
- Supabase `error.message` sendes aldri til UI — kun generisk melding + `console.error`

Nytt punkt i sjekkliste **React Native / Expo**:
- Hermes-inkompatible API-er: søk etter `FileReader`, `TextDecoder` i ny kode — bruk `arrayBuffer()` i stedet
- Postgres-typeformater: `point`-type krever `(lng,lat)` tuple, ikke WKT
- Alle nye Expo native-pakker finnes i `package.json` dependencies
