# Torget MVP: Arkitektur og plan

**Dato:** 2026-03-27

## Tekniske valg

| Valg | Beslutning | Begrunnelse |
|------|-----------|-------------|
| Frontend | React Native + Expo SDK 52 | Én kodebase iOS + Android, Expo forenkler kamera/lokasjon |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Alt-i-ett: DB, auth, fillagring, realtime — ingen ekstra tjenester i MVP |
| Søk | Supabase full-text search (tsvector) | Unngår Algolia-kostnad i MVP, tilstrekkelig for norsk tekst |
| Lokasjon | Expo Location + PostGIS (pg_extension) | Geografisk nærhet-sortering i DB uten ekstern tjeneste |
| Bilder | Supabase Storage | Allerede tilgjengelig, unngår Cloudinary-avhengighet |
| TypeScript | Strict mode | Delte typer mellom DB-schema og UI via supabase-js typegen |
| Navigasjon | Expo Router (file-based) | Standard for Expo, god støtte for tabs + stack |
| State | Zustand + React Query (TanStack Query) | Zustand for lokal UI-state, React Query for server-state/cache |

## Datamodell

```sql
-- Brukerprofiler (utvider Supabase auth.users)
profiles (
  id uuid PK -> auth.users.id,
  display_name text,
  avatar_url text,
  bio text,
  city text,
  avg_rating numeric(2,1),
  review_count int,
  created_at timestamptz
)

-- Annonser
listings (
  id uuid PK,
  seller_id uuid -> profiles.id,
  title text,
  description text,
  price int,               -- null = gis bort
  category listing_category,  -- ENUM: electronics|clothing|furniture|sports|books|other
  condition listing_condition, -- ENUM: new|like_new|good|used|for_parts
  listing_type listing_type,   -- ENUM: sale|wanted|free
  status listing_status,       -- ENUM: active|sold|expired|deleted
  location point,          -- PostGIS point (lng, lat)
  city text,
  search_vector tsvector,  -- generert fra title + description
  view_count int DEFAULT 0,
  created_at timestamptz,
  expires_at timestamptz   -- default 30 dager
)

-- Bilder (1-N per annonse)
listing_images (
  id uuid PK,
  listing_id uuid -> listings.id,
  url text,
  position int,            -- sorteringsrekkefølge
  created_at timestamptz
)

-- Anmeldelser
reviews (
  id uuid PK,
  reviewer_id uuid -> profiles.id,
  reviewed_id uuid -> profiles.id,
  listing_id uuid -> listings.id,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz
)
```

**Supabase RLS-regler:**
- `listings`: alle kan lese `active`, kun eier kan oppdatere/slette
- `listing_images`: følger listing-eierskap
- `reviews`: kun autentiserte brukere, ikke egenvurdering

## Avhengighetsgraf

```
F1: Supabase-oppsett + auth + datamodell
        |
        ├── F2: Annonse-opprettelse (kamera, bilder, form)
        |
        └── F3: Feed + søk (avhenger av F1, kan starte parallelt med F2)
                |
                F4: Brukerprofil + anmeldelser (avhenger av F1+F2+F3)
```

F2 og F3 kan kjøres parallelt etter F1. F4 avhenger av alle tre.

## Implementeringsplan

### F1: Supabase-oppsett, auth og prosjektstruktur ✅
**Leverer:** Fungerende Expo-prosjekt med Supabase-tilkobling, autentisering (e-post/passord), og full datamodell migrert.
**Status:** FERDIG — 2026-03-27

**Endrede filer (20 stk):**
- `package.json`, `tsconfig.json`, `app.json`, `babel.config.js`, `.env.example`, `.gitignore`
- `supabase/migrations/001_initial_schema.sql`
- `lib/supabase.ts`, `lib/types.ts`
- `store/auth.ts`
- `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`
- `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, `app/(tabs)/post.tsx`, `app/(tabs)/profile.tsx`
- `__tests__/store/auth.test.ts`

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| A | `onAuthStateChange`-lytter ryddes aldri opp — memory leak | `initialize()` returnerer unsubscribe, useEffect cleanup kalt |
| A | `mapAuthError` eksponerte engelske Supabase-meldinger | Norsk fallback-melding lagt til |
| M | `SECURITY DEFINER` mangler `SET search_path = public` | Fikset i migrasjonsfil |
| A | `signOut` ignorerte serverfeil | Feil vises til bruker, lokal state ryddes uansett |
| M | Feil `location`-type (`{x,y}` → skal være `string`) | Rettet i `lib/types.ts` |

**Tester:** 13/13 unit-tester bestått

**Akseptansekriterier:**
- [x] Bruker kan registrere seg med e-post og passord
- [x] Bruker kan logge inn og ut
- [x] Innlogget bruker har profil i `profiles`-tabellen (opprettet via trigger)
- [x] Alle tabeller er migrert med korrekte RLS-policies
- [x] App-navigasjon viser tab-bar med 4 tabs etter innlogging

---

### F2: Annonse-opprettelse ✅
**Leverer:** Komplett flyt for å legge ut annonse — fra kamera til publisert — på under 60 sekunder.
**Status:** FERDIG — 2026-03-27

**Endrede filer (11 stk):**
- `lib/storage.ts`, `store/post.ts`
- `hooks/useCreateListing.ts`, `hooks/__tests__/useCreateListing.test.ts`
- `components/listing/ImagePicker.tsx`, `components/listing/ListingForm.tsx`
- `app/post/_layout.tsx`, `app/post/images.tsx`, `app/post/details.tsx`, `app/post/preview.tsx`
- `app/(tabs)/post.tsx`

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| K | `FileReader` ikke tilgjengelig i Hermes — krasjer ved upload | Erstattet med `response.arrayBuffer()` |
| A | WKT-format (`POINT(lng lat)`) ugyldig for Postgres `point` | Endret til `(lng,lat)` tuple-format |
| M | Filnavn-kollisjon ved parallell upload | Bruker nå `crypto.randomUUID()` |
| M | Hardkodet `width: 400` ikke-responsivt | `Dimensions.get('window').width` |
| M | Feilmelding avslørte Supabase-intern info | Generisk brukermelding + `console.error` |

**Tester:** 3/3 unit-tester bestått (useCreateListing)

**Akseptansekriterier:**
- [x] Bruker kan ta opp til 5 bilder med kamera eller velge fra galleri
- [x] Bruker kan fylle ut tittel, beskrivelse, pris, kategori, tilstand og type (salg/ønsket/gratis)
- [x] Bruker kan forhåndsvise annonsen før publisering
- [x] Annonse publiseres med brukerens lokasjon (Expo Location)
- [x] Publisert annonse er synlig i feed umiddelbart
- [x] Hele flyten tar < 60 sekunder for en erfaren bruker

---

### F3: Feed og søk ✅
**Leverer:** Lokal feed sortert på nærhet, og søk med fritekst + filtrering.
**Status:** FERDIG — 2026-03-27

**Endrede filer (10 stk):**
- `lib/queries/listings.ts`, `lib/queries/__tests__/listings.test.ts`
- `hooks/useFeed.ts`, `hooks/useSearch.ts`
- `components/listing/ListingCard.tsx`, `components/listing/ListingDetail.tsx`
- `components/search/FilterSheet.tsx`
- `app/listing/[id].tsx`
- `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| K | Rå Supabase-feilmeldinger eksponert til UI | Generisk melding + `console.error` |
| A | `expo-location` manglet i `package.json` | Installert og lagt til i dependencies |
| A | RPC-suksessresultat ikke validert mot `ListingWithDetails` | Null-guard på `profiles`-feltet lagt til |
| A | `display_name.charAt(0)` uten null-guard i ListingDetail | Optional chaining overalt i sellerCard |
| M | `NaN`/`Infinity` sendt til Supabase fra FilterSheet | `parseFloat` + `isFinite`-validering |

**Tester:** 12/12 unit-tester bestått (listings queries)

**Akseptansekriterier:**
- [x] Feed viser aktive annonser, sortert på geografisk nærhet til bruker
- [x] Bruker kan filtrere feed på type (salg/ønsket/gratis) og kategori
- [x] Fritekst-søk returnerer relevante resultater via tsvector
- [x] Søk støtter filtrering på kategori, pris (min/maks), tilstand og type
- [x] Trykk på annonse viser detaljside med alle bilder og selgerprofil-snipp
- [x] Feed bruker paginering (20 resultater per side)

---

### F4: Brukerprofil og anmeldelser ✅
**Leverer:** Profilside med egne annonser, anmeldelsessystem og profil-redigering.
**Status:** FERDIG — 2026-03-27

**Endrede filer (13 stk):**
- `hooks/useProfile.ts`, `hooks/useReviews.ts`
- `components/profile/ProfileHeader.tsx`, `components/profile/ReviewList.tsx`
- `components/listing/MyListings.tsx`
- `app/(tabs)/profile.tsx`
- `app/profile/[id]/index.tsx`, `app/profile/edit.tsx`
- `app/listing/[id]/index.tsx`, `app/listing/[id]/review.tsx`
- `supabase/migrations/002_reviewer_id_default.sql`
- `__tests__/hooks/useProfile.test.ts`, `__tests__/hooks/useReviews.test.ts`

**Review:** BETINGET GODKJENT → GODKJENT etter fiks
| # | Funn | Løsning |
|---|------|---------|
| K | `listing_id = user-id` i profil-review — FK-violation | Fjernet "Anmeld selger"-knapp fra profil, reviews kun via annonseside |
| K | `reviewer_id` sendt fra klient — kan forfalske reviews | Fjernet fra insert-payload, settes nå automatisk via `DEFAULT auth.uid()` |
| A | Ingen filtype-validering på avatar-upload | `asset.type !== 'image'`-sjekk lagt til |
| A | `.map()` i stedet for FlatList i offentlig profil | Erstattet med `FlatList scrollEnabled={false}` |

**Tester:** 8/8 unit-tester bestått (useProfile + useReviews)

**Akseptansekriterier:**
- [x] Innlogget bruker ser egne aktive og avsluttede annonser
- [x] Bruker kan redigere profil (navn, by, avatar)
- [x] Bruker kan markere annonse som solgt
- [x] Kjøper kan gi anmeldelse (1-5 stjerner + kommentar) etter handel
- [x] Offentlig profil viser snitt-rating, antall anmeldelser og aktive annonser
- [x] Bruker kan ikke anmelde seg selv

---

## Risiko

1. **PostGIS-spørringer i Supabase** — geografisk nærhet-sortering krever `earthdistance`-extension og korrekt indeksering. Må verifiseres i F1 før F3 bygger på det. Fallback: sorter på `city`-match hvis PostGIS viser seg tregt.

2. **Bilde-opplasting på mobil** — stor komprimering nødvendig før upload for å holde < 60 sek-kravet. Bruk `expo-image-manipulator` for å resize til maks 1200px og komprimere til 70% JPEG før opplasting.

3. **Expo Location-tillatelser** — iOS/Android krever eksplisitt tillatelse. Appen må degradere pent dersom brukeren avslår — vis feed uten nærhet-sortering og be om by manuelt.
