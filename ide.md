# Applikasjonside: Torget

## Konsept

En lokal markedsplass for kjøp, salg og gratis-gis av brukte ting — med fokus på nærhet, enkelhet og bærekraft. Inspirert av finn.no, men bygget for mobilbruk og med sosiale elementer som skaper tillit.

---

## Kjernefunksjoner

### Annonser
- Legg ut annonse med bilder, tittel, pris og beskrivelse
- Tre kategorier: **Til salgs**, **Ønskes kjøpt**, **Gis bort gratis**
- Kategoritre (elektronikk, klær, møbler, sport, bøker, etc.)
- Tilstand: ny, som ny, pent brukt, brukt, for deler

### Søk og oppdagelse
- Fritekst + filtrering på kategori, pris, tilstand, avstand
- Kartsøk: vis annonser i nærheten av deg
- Lagrede søk med push-varsler ("gi meg beskjed når noen selger en Nikon i Bergen")
- Feed: kronologisk eller personalisert basert på tidligere søk

### Kommunikasjon
- Innebygd meldingssystem mellom kjøper og selger
- Tilbudsfunksjon: send motbud direkte i chat
- Automatisk svar-mal ("fortsatt tilgjengelig?")

### Profil og tillit
- Brukerprofil med salgshistorikk og anmeldelser (1–5 stjerner)
- Verifisert bruker via BankID eller e-post
- Responstid og svarrate synlig på profil
- "Selger fra"-by synlig på alle annonser

### Gratis-gis
- Dedikert seksjon for ting som gis bort
- "Første til mølla"-logikk eller loddtrekning om mange vil ha
- Mulighet for å sette krav: "kun til familier med barn"

---

## Differensiering fra finn.no

| Finn.no | Torget |
|---------|--------|
| Desktop-first | Mobile-first |
| Bred, nasjonal | Lokal-først (nærhet vektes) |
| Kompleks navigasjon | Enkel, rask annonsering (< 60 sek) |
| Ingen sosiale elementer | Følg selgere, lik annonser |
| Betaling utenfor | Innebygd betaling (Vipps-integrasjon) |
| Ingen gratis-seksjon fremhevet | Gratis-gis er første klasse |

---

## Teknisk retning

- **Frontend:** React Native (iOS + Android fra én kodebase)
- **Backend:** Node.js / Supabase (auth, database, storage)
- **Kart:** Mapbox eller Google Maps API
- **Betaling:** Vipps MobilePay API
- **Bilder:** Cloudinary eller Supabase Storage
- **Søk:** Algolia eller Meilisearch for rask fritekst

---

## Brukerreise (kjøp)

1. Åpne app → se feed med lokale annonser
2. Trykk på annonse → se bilder, beskrivelse, selgerprofil
3. Send melding eller legg inn bud
4. Avtal henting eller sending
5. Betal via Vipps i appen
6. Gi anmeldelse av selger

## Brukerreise (salg)

1. Trykk "Legg ut" → ta bilde med kamera
2. Velg kategori og tilstand
3. Sett pris (eller "Gis bort")
4. Publiser — annonsen er live på < 60 sekunder
5. Motta meldinger, godta bud
6. Marker som solgt

---

## Mulige utvidelser

- **Torget Bedrift:** småbedrifter kan selge brukte kontormøbler, utstyr etc.
- **Abonnement for selgere:** fremhevede annonser, statistikk
- **CO2-kalkulator:** vis estimert klimagevinst ved å kjøpe brukt
- **Wishlist-deling:** del ønskeliste med venner/familie

---

## Navn og posisjonering

**Torget** — enkelt, norsk, assosierer til det lokale torget. Alternativt: *Byttet*, *Videre*, *Ombruk*.

Posisjonering: *"Det lokale torget — i lomma di."*
