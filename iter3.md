# Iterasjon 3: Innloggingsfiks, testdata og V2 (kartsøk + meldinger + bud)

**Dato:** 2026-03-27
**Basert på:** iter2-stacken (Fastify + PostgreSQL/PostGIS + Redis + MinIO, Docker Compose)
**Startes med:** `start iterasjon 3`

---

## Kontekst

Iter2 leverte full Docker-stack og Supabase-migrasjon. Følgende feil og mangler er oppdaget
gjennom manuell testing og skal løses i iter3:

1. **Innlogging virker ikke** — JWT mangler `email`-claim
2. **Ingen testdata** — databasen er tom, umulig å teste uten å opprette alt manuelt
3. **V2-funksjoner** — kartsøk, meldingssystem, budfunksjon

---

## Del 1: Kritisk fiks — JWT email-claim

### Problem
`apps/api/src/lib/jwt.ts` → `signAccessToken(userId)` signerer kun `{ sub: userId }`.

`torget/store/auth.ts` → `decodeJwtPayload()` krever **både** `sub` og `email` i payload:
```typescript
if (typeof payload?.sub !== 'string' || typeof payload?.email !== 'string') {
  return null;  // ← dette skjer alltid
}
```

**Konsekvens:** `signIn` og `signUp` kaller `decodeJwtPayload` → returnerer null → setter
aldri session → viser "Noe gikk galt. Prøv igjen." selv ved korrekt innlogging.

### Fiks (må gjøres i F1)
`signAccessToken(userId, email)` — legg til `email` som claim i access-tokenet.
Oppdater alle kallsteder i `auth.ts` (register og login returnerer brukerobjekt,
send videre til signAccessToken).

---

## Del 2: Testdata (seed)

### Krav
En seed-script (`apps/api/scripts/seed.ts`) som kan kjøres med:
```bash
docker compose exec api node dist/apps/api/scripts/seed.js
# eller lokalt:
cd apps/api && npx tsx scripts/seed.ts
```

### Testbrukere (faste passord for utvikling)

| Navn | E-post | Passord |
|------|--------|---------|
| Ola Nordmann | ola@test.no | Test1234! |
| Kari Hansen | kari@test.no | Test1234! |
| Per Olsen | per@test.no | Test1234! |

### Testannonser (minst 10 stk, variert)

Spred mellom kategorier: `electronics`, `clothing`, `furniture`, `sports`, `books`, `other`
Typer: mix av `sale`, `free`, `wanted`
Tilstand: mix av `new`, `like_new`, `good`, `used`
Lokasjoner: Oslo-området (lat 59.9, lng 10.75) med litt variasjon (±0.05 grader)
Priser: fra 0 (gratis) til 5000 kr

Eksempel-annonser:
- "iPhone 14 64GB" — electronics, sale, good, 3500 kr
- "Sykkel dame 26\"" — sports, sale, used, 800 kr
- "IKEA Kallax hylle" — furniture, sale, good, 400 kr
- "Barneklær 2-3 år" — clothing, free, used, 0 kr
- "Søker sofa til stue" — furniture, wanted, any, null
- "MacBook Pro 2020" — electronics, sale, like_new, 8000 kr
- "Løpesko str 42" — sports, sale, good, 300 kr
- "Bøker diverse" — books, free, used, 0 kr
- "Strikket genser" — clothing, sale, like_new, 150 kr
- "Kaffemaskiner DeLonghi" — electronics, sale, good, 600 kr

### Bilder
Bruk placeholder-URL-er fra picsum.photos (ingen MinIO-avhengighet for seed):
`https://picsum.photos/seed/{listing-id}/800/600`

### Anmeldelser
- Ola anmelder Kari (5 stjerner, "Rask levering!")
- Kari anmelder Per (4 stjerner, "Varene var som beskrevet")

### Idempotens
Seed-scriptet sjekker om testbrukerne allerede finnes — kjøres trygt flere ganger.

---

## Del 3: V2 — Kartsøk, meldingssystem og budfunksjon

### 3a. Kartsøk

**Mål:** Brukere kan se annonser på kart og filtrere på avstand.

#### Backend
- `GET /listings?lat=59.9&lng=10.75&radius=10` — returner annonser innen `radius` km
  sortert på avstand (PostGIS `earthdistance` — allerede installert)
- Eksisterende `GET /listings` utvides med valgfrie query-params: `lat`, `lng`, `radius`
- Annonser uten lokasjon vises ikke i kartsøk (men vises i vanlig feed)

#### App
- Ny fane/skjerm: **Kart** — bruker `react-native-maps` (eksisterende Expo-pakke)
- Viser pins for aktive annonser med lokasjon
- Trykk på pin åpner detaljside (eksisterende `app/listing/[id]`)
- Finn min posisjon-knapp (`expo-location`, allerede i stack)
- Radius-slider (5 / 10 / 25 / 50 km)

### 3b. Meldingssystem

**Mål:** Kjøper kan kontakte selger direkte i appen.

#### Datamodell (nye tabeller)
```sql
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (listing_id, buyer_id)
);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         text NOT NULL,
  type            text NOT NULL DEFAULT 'message',  -- 'message' | 'offer'
  offer_amount    integer,  -- kun for type='offer'
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);
```

#### API-endepunkter (nye)
| Metode | Path | Auth | Beskrivelse |
|--------|------|------|-------------|
| GET | /conversations | Bearer | Mine samtaler (som kjøper eller selger) |
| POST | /conversations | Bearer | Start samtale om en annonse |
| GET | /conversations/:id/messages | Bearer + deltaker | Hent meldinger |
| POST | /conversations/:id/messages | Bearer + deltaker | Send melding |

#### App — skjermer
- **Meldinger-fane** (ny tab i `(tabs)`): liste over mine samtaler
- **Samtale-skjerm** (`app/conversation/[id].tsx`): chat-UI med meldingsliste og input
- **"Kontakt selger"-knapp** på detaljside (`app/listing/[id]/index.tsx`) — vises for
  innloggede brukere som IKKE er selgeren

### 3c. Budfunksjon

**Mål:** Kjøper kan legge inn bud i en samtale; selger kan akseptere eller avslå.

Budfunksjon er en utvidelse av meldingssystemet — bruker samme `messages`-tabell
med `type='offer'` og `offer_amount`.

#### API-endepunkter (utvidelse)
| Metode | Path | Auth | Beskrivelse |
|--------|------|------|-------------|
| POST | /conversations/:id/messages | Bearer | Send bud (`type: 'offer', offerAmount: 1500`) |
| POST | /conversations/:id/offers/:msgId/accept | Bearer + selger | Aksepter bud → markerer annonse som solgt |
| POST | /conversations/:id/offers/:msgId/decline | Bearer + selger | Avslå bud |

#### App — UI
- Budknapp i chat-input (kun for kjøper)
- Bud vises med aksepter/avslå-knapper (kun for selger)
- Akseptert bud sender bruker til bekreftelse-skjerm

---

## Avhengighetsgraf

```
F1 (JWT-fiks + seed)  ──────────────────────────────────────────── standalone
F2 (Kartsøk API + app) ─────────────────────────────────────────── standalone
F3 (Meldingssystem DB + API + app) ───────────────────────────────── avhenger av F1
F4 (Budfunksjon — utvidelse av meldinger) ──── avhenger av F3
```

F1 og F2 kan implementeres parallelt. F3 avhenger av F1 (innlogget bruker nødvendig).
F4 avhenger av F3.

---

## Akseptansekriterier

### F1: JWT-fiks + seed
- [ ] Bruker kan registrere seg og se session satt korrekt etter registrering
- [ ] Bruker kan logge inn med ola@test.no / Test1234! og se session
- [ ] `GET /listings` returnerer 10+ testannonser etter seed
- [ ] Seed-script er idempotent (kjøres to ganger uten feil)
- [ ] `tsc --noEmit` passerer

### F2: Kartsøk
- [ ] `GET /listings?lat=59.9&lng=10.75&radius=10` returnerer annonser innen 10 km
- [ ] Annonser med lokasjon vises som pins på kart-skjermen
- [ ] Trykk på pin åpner riktig detaljside
- [ ] "Finn min posisjon" henter GPS og sentrerer kart
- [ ] Radius-filter fungerer (5/10/25/50 km)

### F3: Meldingssystem
- [ ] Innlogget kjøper kan starte samtale med selger via "Kontakt selger"-knapp
- [ ] Selger kan se alle innkommende samtaler i Meldinger-fanen
- [ ] Meldinger vises i riktig rekkefølge
- [ ] Ikke-deltakere får 403 på `GET /conversations/:id/messages`
- [ ] Selger kan ikke starte samtale med seg selv

### F4: Budfunksjon
- [ ] Kjøper kan sende bud med beløp i en samtale
- [ ] Selger ser bud med aksepter/avslå-knapper
- [ ] Akseptert bud markerer annonsen som solgt
- [ ] Avslått bud endrer ikke annonsestatus
- [ ] Kun selger kan akseptere/avslå bud

---

## Tekniske noter til arkitekt

### React Native Maps
Bruk `react-native-maps` via Expo — allerede tilgjengelig som `expo install react-native-maps`.
På web: bruk `MapView` med `provider={PROVIDER_GOOGLE}` (krever Google Maps API-nøkkel i `.env`)
eller vis fallback-tekst på web. Kart er primært native-funksjon.

### Meldingssystem: polling vs WebSocket
Bruk polling (`useQuery` med `refetchInterval: 3000`) i første omgang — ingen WebSocket-infrastruktur
nødvendig. Redis pub/sub kan legges til i V3 for realtime.

### Lokasjon i seed-data
PostGIS `point`-type: bruk `(lng,lat)` tuple-format i INSERT-verdier, f.eks.:
```sql
INSERT INTO listings (location, ...) VALUES ('(10.75,59.91)', ...);
```

### Monorepo-plasserering
Seed-scriptet legges i `apps/api/scripts/seed.ts` og kompileres med tsc.
Kjøres mot kjørende Docker-database via `DATABASE_URL`.

---

## Kjørekommandoer for oppstart

```bash
# Start stack
docker compose up -d

# Kjør seed (etter docker compose up)
docker compose exec api node dist/apps/api/scripts/seed.js

# Start app
cd torget && npx expo start --web

# Verifiser login manuelt
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ola@test.no","password":"Test1234!"}'
```
