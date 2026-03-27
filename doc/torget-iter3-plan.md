# Iterasjon 3 — Plan: JWT-fiks, testdata, kartsøk, meldinger og bud

**Dato:** 2026-03-27
**Status:** F1 ✅ F2 ✅ F3 ✅ F4 ✅ — FERDIG

---

## Fasestatus

### F1 — JWT-fiks og seed ✅ (2026-03-27)

**Endrede filer:**
- `apps/api/src/lib/jwt.ts` — `signAccessToken(userId, email)` med email-claim
- `apps/api/src/routes/auth.ts` — register/login sender email; refresh henter fra DB; token rotation rekkefølge korrekt; blacklist-sjekk korrekt plassert
- `apps/api/tsconfig.json` — scripts lagt til i include
- `apps/api/scripts/seed.ts` — ny fil, idempotent, bcrypt, 3 brukere, 10 annonser, 2 reviews
- `apps/api/src/__tests__/jwt.test.ts` — ny, 8 tester
- `apps/api/drizzle/migrations/0002_search_vector_trigger.sql` — `DROP TRIGGER IF EXISTS` (idempotens-fix)

**Review-funn:**
| # | Alv. | Beskrivelse | Løsning |
|---|------|-------------|---------|
| 1 | A | Blacklist-sjekk rekkefølge i refresh | Allerede korrekt (ingen endring) |
| 2 | A | Token rotation race condition | Allerede korrekt (kommentar klargjort) |
| 4 | M | Dead code: olaListing-oppslag i seed | Dokumentert, ikke blokkerende |
| 5 | M | auth-plugin eksponerer ikke email fra token | Utsatt til F3 ved behov |

**Testresultat:** 22/22 API-tester, tsc ✅, Docker smoke ✅, login + JWT email ✅, seed idempotent ✅

---

### F2 — Kartsøk ✅ (2026-03-27)

**Endrede filer:**
- `apps/api/src/routes/listings.ts` — radius-filtrering, `location IS NOT NULL` i geo-grenen, `inArray()` fix, `lat`/`lng` params
- `packages/shared/types.ts` — `MapParams` interface
- `torget/package.json` — `react-native-maps` dependency
- `torget/lib/queries/listings.ts` — `fetchMapListings()`
- `torget/hooks/useMapListings.ts` — ny, `parseLocationString()`, TanStack Query
- `torget/hooks/__tests__/useMapListings.test.ts` — ny, 8 tester
- `torget/app/(tabs)/map.tsx` — ny kart-fane
- `torget/app/(tabs)/_layout.tsx` — kart-tab lagt til

**Review-funn:**
| # | Alv. | Beskrivelse | Løsning |
|---|------|-------------|---------|
| 3 | A | Geo-grenen inkluderte location-løse annonser | Fikset: `AND l.location IS NOT NULL` |
| 6 | M | description mangler maxLength i schema | Utsatt |
| 7 | M | location mangler format-validering i schema | Utsatt |
| 8 | L | Non-null assertion i map.tsx | Ikke-blokkerende |

**Testresultat:** 47/47 app-tester, tsc ✅, radius-filtrering ✅, 3 infra-bugs fikset av tester

---

### F3 — Meldingssystem ✅ (2026-03-27)

**Endrede filer:**
- `apps/api/drizzle/migrations/0003_conversations.sql` — ny migrasjonsfil
- `apps/api/drizzle/schema.ts` — conversations + messages tabeller, uniqueIndex lagt til
- `apps/api/src/routes/conversations.ts` — 4 endepunkter + Drizzle ORM upsert-fallback
- `apps/api/src/index.ts` — conversations-routes registrert
- `apps/api/src/__tests__/conversations.test.ts` — 10 API-tester
- `torget/app/(tabs)/messages.tsx` — samtale-liste med auth-sjekk
- `torget/app/(tabs)/_layout.tsx` — Meldinger-tab
- `torget/app/conversation/[id].tsx` — chat-skjerm
- `torget/app/listing/[id]/index.tsx` — "Kontakt selger"-knapp
- `torget/hooks/useConversations.ts` — ny hook
- `torget/hooks/useMessages.ts` — ny hook, refetchInterval 3000
- `torget/lib/queries/conversations.ts` — API-klient
- `torget/lib/types.ts` + `packages/shared/types.ts` — Conversation, Message interfaces
- `torget/lib/queries/__tests__/conversations.test.ts` — 11 query-tester

**Review-funn:**
| # | Alv. | Beskrivelse | Løsning |
|---|------|-------------|---------|
| 1 | A | Raw SQL i upsert-fallback | Fikset: Drizzle ORM-spørring |
| 2 | A | console.error → Fastify-native logging | Fikset: request.log.error |
| 3 | M | uniqueIndex mangler i schema.ts | Fikset: lagt til |
| 4 | M | refetchInterval uten staleTime | Utsatt (ikke blokkerende) |
| 5 | L | AuthModal-melding ikke kontekstsensitiv | Utsatt |

**Testresultat:** 32/32 API-tester, 58/58 app-tester, tsc ✅, alle 5 integrasjonstester ✅

---

### F4 — Budfunksjon ✅ (2026-03-27)

**Endrede filer:**
- `apps/api/src/routes/conversations.ts` — accept/decline-endepunkter med transaksjon, race-guard, msgId-tilhørighetssjekk
- `apps/api/src/__tests__/conversations.test.ts` — 6 nye tester (accept, decline, 403, 400)
- `torget/app/conversation/[id].tsx` — budknapp (kun kjøper), Modal for beløp, OfferMessage-rendering
- `torget/components/conversation/OfferMessage.tsx` — ny komponent
- `torget/hooks/useMessages.ts` — useRespondToOffer hook
- `torget/lib/queries/conversations.ts` — respondToOffer funksjon
- `torget/lib/queries/__tests__/conversations.test.ts` — 5 nye tester

**Review-funn:**
| # | Alv. | Beskrivelse | Løsning |
|---|------|-------------|---------|
| 1 | M | Decline mangler race-guard | Fikset: isNull(offerStatus) guard |
| 2 | M | isBuyer alltid true for selger | Fikset: myId === conversation.buyerId |
| 3 | L | msgId mangler conversationId-sjekk | Fikset: eq(messages.conversationId, id) i WHERE |

**Testresultat:** 38/38 API-tester, 63/63 app-tester, tsc ✅, alle 6 integrasjonstester ✅

---

---

## Tekniske valg

| Område | Valg | Begrunnelse |
|--------|------|-------------|
| Kart | `react-native-maps` via Expo | Allerede i Expo-stacken, støtter iOS/Android native |
| Kart web | Fallback-tekst | Kart er native-funksjon, unngå Google Maps API-avhengighet |
| Meldingspolling | TanStack Query `refetchInterval: 3000` | Ingen WebSocket-infra nødvendig i V2 |
| Seed | `npx tsx scripts/seed.ts` | Kjøres mot kjørende PostgreSQL via `DATABASE_URL` |
| Bud | Utvidelse av `messages`-tabell | `type='offer'` + `offer_amount` — ingen ny tabell |
| Tilstandsmarkering bud | `offer_status` kolonne i messages | `null / accepted / declined` — atomisk oppdatering |
| conversations-tilgang | `buyer_id` eller `seller_id` === `request.user.id` | Autorisasjonssjekk i alle conversation-ruter |

---

## Datamodell — nye tabeller

```sql
-- F3
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
  offer_amount    integer,
  offer_status    text,                              -- null | 'accepted' | 'declined'
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX conversations_buyer_idx ON conversations(buyer_id);
CREATE INDEX conversations_seller_idx ON conversations(seller_id);
```

---

## Nye API-endepunkter

| Metode | Path | Auth | Beskrivelse |
|--------|------|------|-------------|
| GET | /listings?lat=&lng=&radius= | Ingen | Radius-filtrering på eksisterende endepunkt |
| GET | /conversations | Bearer | Mine samtaler (kjøper eller selger) |
| POST | /conversations | Bearer | Start samtale om annonse |
| GET | /conversations/:id/messages | Bearer + deltaker | Hent meldinger |
| POST | /conversations/:id/messages | Bearer + deltaker | Send melding eller bud |
| POST | /conversations/:id/offers/:msgId/accept | Bearer + selger | Aksepter bud → annonse solgt |
| POST | /conversations/:id/offers/:msgId/decline | Bearer + selger | Avslå bud |

---

## Avhengighetsgraf

```
F1 (JWT-fiks + seed)
  ├─ F2 (kartsøk API + kart-fane)   ← uavhengig av F1
  └─ F3 (meldingssystem)            ← avhenger av F1 (autentisert bruker)
       └─ F4 (budfunksjon)          ← avhenger av F3

F1 og F2 kan implementeres parallelt.
F3 starter etter F1.
F4 starter etter F3.
```

---

## F1 — JWT-fiks og seed

**Leverer:** Fungerende innlogging + populert testdatabase

### Berørte filer
- `apps/api/src/lib/jwt.ts` — legg til `email`-parameter i `signAccessToken`
- `apps/api/src/routes/auth.ts` — oppdater alle kall til `signAccessToken` (register + login + refresh)
- `apps/api/src/plugins/auth.ts` — vurder om `verifyToken` bør returnere `email` fra payload
- `apps/api/scripts/seed.ts` — ny fil
- `packages/shared/types.ts` — ingen endring (email hentes fra JWT-payload)

### JWT-fiks i detalj
- `signAccessToken(userId: string, email: string)` — signer `{ sub: userId, email }` i stedet for kun `{ sub: userId }`
- `routes/auth.ts` register: har `result.email` tilgjengelig — send videre til `signAccessToken`
- `routes/auth.ts` login: har `user.email` tilgjengelig — send videre til `signAccessToken`
- `routes/auth.ts` refresh: etter `verifyToken` må email hentes fra DB eller legges i refresh-token. Enklest: hent bruker fra DB på `sub`, bruk `user.email`. Alternativt: legg email også i refresh-token (ingen endring i `auth.ts` verifiction-logikk). **Valg: hent fra DB ved refresh** — unngår å endre refresh-token-format.

### Seed-krav
- 3 testbrukere: ola@test.no, kari@test.no, per@test.no (passord: Test1234!)
- 10 annonser spredt på kategorier, typer og tilstand — Oslo-koordinater `(10.75,59.9)` ±0.05
- Bilder: `https://picsum.photos/seed/{slug}/800/600`
- 2 anmeldelser (Ola→Kari 5*, Kari→Per 4*)
- Idempotent: sjekk om `ola@test.no` finnes — hopp over insert om den gjør det

### Akseptansekriterier
- Bruker kan registrere seg og session settes korrekt etter registrering
- Bruker kan logge inn med ola@test.no / Test1234! og se session
- `GET /listings` returnerer 10+ testannonser etter seed
- Seed-script er idempotent (kjøres to ganger uten feil)
- `tsc --noEmit` passerer

---

## F2 — Kartsøk

**Leverer:** Radius-filtrering på API + kart-fane i appen

### Berørte filer
**API:**
- `apps/api/src/routes/listings.ts` — utvid `FeedQuery` med `radius?: string`, legg til WHERE-clause i geo-grenen

**App:**
- `torget/app/(tabs)/map.tsx` — ny fil (kart-fane)
- `torget/app/(tabs)/_layout.tsx` — legg til kart-tab (ikon: `map-outline` / `map`)
- `torget/hooks/useMapListings.ts` — ny hook (TanStack Query, henter listings med lat/lng/radius)
- `packages/shared/types.ts` — legg til `MapParams` interface (lat, lng, radius)

### Backend-endring
Eksisterende geo-grein i `GET /listings` kjøres allerede ved `lat`+`lng`. Legg til:
- Parse `radius` (default: ingen filtrering, kun sortering — behold eksisterende oppførsel)
- Når `radius` er oppgitt: `AND earth_distance(...) <= ${radius * 1000}` (meter)
- Bare annonser MED lokasjon inkluderes i radius-spørring (NULL location håndteres allerede med `NULLS LAST`)

### App-arkitektur
- `MapView` fra `react-native-maps`, `Marker` per annonse med lokasjon
- Parse lokasjon fra `"(lng,lat)"` tuple-streng — enkel split
- Radius-slider: `[5, 10, 25, 50]` km — controlled state, trigger ny query ved endring
- "Finn min posisjon"-knapp: `expo-location` `getCurrentPositionAsync` → oppdater kart-region
- Trykk på pin: `router.push('/listing/' + listing.id)`
- Web: `<View>` med tekst "Kart er ikke tilgjengelig på web"

### Akseptansekriterier
- `GET /listings?lat=59.9&lng=10.75&radius=10` returnerer kun annonser innen 10 km
- Annonser med lokasjon vises som pins på kart-skjermen
- Trykk på pin åpner riktig detaljside
- "Finn min posisjon" henter GPS og sentrerer kart
- Radius-filter fungerer (5/10/25/50 km)

---

## F3 — Meldingssystem

**Leverer:** Samtaler mellom kjøper og selger, Meldinger-fane, chat-skjerm

### Berørte filer
**DB/Migrasjon:**
- `apps/api/drizzle/schema.ts` — legg til `conversations` og `messages` tabeller
- `apps/api/drizzle/migrations/0003_conversations.sql` — ny migrasjonsfil

**API:**
- `apps/api/src/routes/conversations.ts` — ny fil med alle 4 endepunkter
- `apps/api/src/index.ts` — registrer conversations-routes

**App:**
- `torget/app/(tabs)/messages.tsx` — ny fil (samtale-liste)
- `torget/app/(tabs)/_layout.tsx` — legg til Meldinger-tab (ikon: `chatbubble-outline` / `chatbubble`)
- `torget/app/conversation/[id].tsx` — ny fil (chat-skjerm med input)
- `torget/app/listing/[id]/index.tsx` — legg til "Kontakt selger"-knapp (vises for innloggede ikke-selgere)
- `torget/hooks/useConversations.ts` — ny hook (liste over samtaler)
- `torget/hooks/useMessages.ts` — ny hook (meldinger i samtale, `refetchInterval: 3000`)
- `packages/shared/types.ts` — legg til `Conversation`, `Message` interfaces

### API-detaljer
**POST /conversations:** Body `{ listingId }`. Sjekk: kjøper !== selger. Upsert: returner eksisterende samtale om den finnes (UNIQUE constraint). Hent `seller_id` fra listing.

**GET /conversations:** Returner samtaler hvor `buyer_id = me` OR `seller_id = me`. Inkluder listing-tittel og motpartens `display_name`.

**GET /conversations/:id/messages:** Deltaker-sjekk: `buyer_id = me` OR `seller_id = me`. Returner meldinger `ORDER BY created_at ASC`.

**POST /conversations/:id/messages:** Body `{ content, type?, offerAmount? }`. Deltaker-sjekk. Type `offer` krever `offerAmount > 0`. Sett `offer_status = null` for nye bud.

### Akseptansekriterier
- Innlogget kjøper kan starte samtale med selger via "Kontakt selger"-knapp
- Selger kan se alle innkommende samtaler i Meldinger-fanen
- Meldinger vises i riktig rekkefølge
- Ikke-deltakere får 403 på `GET /conversations/:id/messages`
- Selger kan ikke starte samtale med seg selv (400)

---

## F4 — Budfunksjon

**Leverer:** Bud i chat, aksepter/avslå for selger, annonsestatus oppdateres

### Berørte filer
**API:**
- `apps/api/src/routes/conversations.ts` — legg til accept/decline-endepunkter

**App:**
- `torget/app/conversation/[id].tsx` — legg til budknapp (kjøper) og aksepter/avslå (selger)
- `torget/components/conversation/OfferMessage.tsx` — ny komponent for bud-visning

### API-detaljer
**POST /conversations/:id/offers/:msgId/accept:**
- Sjekk: `request.user.id === conversation.seller_id`
- Sjekk: melding finnes, `type = 'offer'`, `offer_status IS NULL`
- Transaksjon: oppdater `messages.offer_status = 'accepted'`, oppdater `listings.status = 'sold'`
- Returner `{ status: 'accepted' }`

**POST /conversations/:id/offers/:msgId/decline:**
- Sjekk: selger
- Oppdater `messages.offer_status = 'declined'`
- Returner `{ status: 'declined' }`

### App-detaljer
- Budknapp vises i chat-input kun når `me === buyer`
- Budknapp åpner modal/dialog for inntasting av beløp
- Bud-melding rendres med `OfferMessage`-komponent: viser beløp + status
- Aksepter/avslå-knapper vises på bud-meldinger kun når `me === seller` og `offer_status === null`
- Etter aksept: invalider `['listing', id]` query → feed viser annonsen som solgt

### Akseptansekriterier
- Kjøper kan sende bud med beløp i en samtale
- Selger ser bud med aksepter/avslå-knapper
- Akseptert bud markerer annonsen som solgt
- Avslått bud endrer ikke annonsestatus
- Kun selger kan akseptere/avslå bud (andre får 403)

---

## Risiko

| Risiko | Sannsynlighet | Tiltak |
|--------|--------------|--------|
| `react-native-maps` krever native rebuild ved første installasjon | Høy | Installer med `expo install react-native-maps` og restart Expo med `--clear` |
| Lokasjon-parsing fra `"(lng,lat)"` tuple er fragil | Medium | Legg parseringsfunksjon i `packages/shared/` med enhetstester |
| Race condition: bud aksepteres to ganger | Lav | `WHERE offer_status IS NULL` i UPDATE + transaksjons-lock forhindrer dobbel-aksept |

---

## Faserekkefølge

1. **F1 + F2 parallelt** (uavhengige)
2. **F3** etter F1 (avhenger av fungerende auth)
3. **F4** etter F3 (utvidelse av meldinger)
