/**
 * Seed script — populates database with test users, listings, and reviews.
 *
 * Usage:
 *   cd apps/api && npx tsx scripts/seed.ts
 *
 * Idempotent: exits early if ola@test.no already exists.
 * Uses pg (node-postgres) directly to avoid Drizzle schema dependencies.
 */

import { Client } from 'pg';
import bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const BCRYPT_COST = 10;
const PASSWORD = 'Test1234!';

interface UserRow {
  id: string;
  email: string;
}

interface ListingRow {
  id: string;
  title: string;
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Idempotency check — skip entire seed if ola@test.no exists
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['ola@test.no'],
    );

    if (existing.rows.length > 0) {
      console.log('Seed data already exists — skipping.');
      return;
    }

    console.log('Seeding database...');

    // --- Users ---
    const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_COST);

    const usersResult = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash)
       VALUES
         ('ola@test.no', $1),
         ('kari@test.no', $1),
         ('per@test.no', $1)
       RETURNING id, email`,
      [passwordHash],
    );

    const [ola, kari, per] = usersResult.rows as [UserRow, UserRow, UserRow];
    console.log(`Created users: ${ola.email}, ${kari.email}, ${per.email}`);

    // --- Profiles ---
    await client.query(
      `INSERT INTO profiles (id, display_name)
       VALUES
         ($1, 'Ola Nordmann'),
         ($2, 'Kari Hansen'),
         ($3, 'Per Olsen')`,
      [ola.id, kari.id, per.id],
    );
    console.log('Created profiles');

    // --- Listings ---
    // Sellers are distributed: ola gets 4, kari gets 4, per gets 2
    type ListingInput = {
      sellerId: string;
      title: string;
      description: string;
      price: number | null;
      category: string;
      condition: string;
      listingType: string;
      location: string | null;
      city: string | null;
    };

    const listingData: ListingInput[] = [
      {
        sellerId: ola.id,
        title: 'iPhone 14 64GB',
        description: 'Godt brukt iPhone 14, fungerer perfekt. Lader følger med.',
        price: 3500,
        category: 'electronics',
        condition: 'good',
        listingType: 'sale',
        location: '(10.755,59.905)',
        city: 'Oslo',
      },
      {
        sellerId: ola.id,
        title: 'Sykkel dame 26"',
        description: 'Fin damestykkel, 3-girs. Litt rust på kjeden men ellers bra.',
        price: 800,
        category: 'sports',
        condition: 'used',
        listingType: 'sale',
        location: '(10.745,59.895)',
        city: 'Oslo',
      },
      {
        sellerId: ola.id,
        title: 'IKEA Kallax hylle',
        description: '2x4 Kallax hylle i hvit, lett brukt. Må hentes.',
        price: 400,
        category: 'furniture',
        condition: 'good',
        listingType: 'sale',
        location: '(10.760,59.910)',
        city: 'Oslo',
      },
      {
        sellerId: ola.id,
        title: 'Barneklær 2-3 år',
        description: 'Pose med diverse barneklær, str 92-98. Rene og pene.',
        price: 0,
        category: 'clothing',
        condition: 'used',
        listingType: 'free',
        location: '(10.740,59.900)',
        city: 'Oslo',
      },
      {
        sellerId: kari.id,
        title: 'Søker sofa til stue',
        description: 'Ser etter en 3-seter sofa til stua. Kontakt meg om du har noe!',
        price: null,
        category: 'furniture',
        condition: 'used',
        listingType: 'wanted',
        location: null,
        city: null,
      },
      {
        sellerId: kari.id,
        title: 'MacBook Pro 2020',
        description: 'MacBook Pro 13" 2020, M1, 8GB RAM, 256GB SSD. Som ny.',
        price: 8000,
        category: 'electronics',
        condition: 'like_new',
        listingType: 'sale',
        location: '(10.750,59.915)',
        city: 'Oslo',
      },
      {
        sellerId: kari.id,
        title: 'Løpesko str 42',
        description: 'Nike løpesko, str 42. Brukt noen ganger, veldig god stand.',
        price: 300,
        category: 'sports',
        condition: 'good',
        listingType: 'sale',
        location: '(10.765,59.895)',
        city: 'Oslo',
      },
      {
        sellerId: kari.id,
        title: 'Bøker diverse',
        description: 'Diverse romaner og fagbøker. Gis bort gratis, ta det du vil ha.',
        price: 0,
        category: 'books',
        condition: 'used',
        listingType: 'free',
        location: '(10.735,59.905)',
        city: 'Oslo',
      },
      {
        sellerId: per.id,
        title: 'Strikket genser',
        description: 'Håndstrikket ullgenser, str M. Aldri brukt.',
        price: 150,
        category: 'clothing',
        condition: 'like_new',
        listingType: 'sale',
        location: '(10.755,59.890)',
        city: 'Oslo',
      },
      {
        sellerId: per.id,
        title: 'Kaffemaskin DeLonghi',
        description: 'DeLonghi kaffemaskin med dampstav. Fungerer bra, selges pga oppgradering.',
        price: 600,
        category: 'electronics',
        condition: 'good',
        listingType: 'sale',
        location: '(10.748,59.908)',
        city: 'Oslo',
      },
    ];

    const insertedListings: ListingRow[] = [];

    for (const listing of listingData) {
      const slug = listing.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const imageUrl = `https://picsum.photos/seed/${slug}/800/600`;

      const listingResult = await client.query<ListingRow>(
        `INSERT INTO listings
           (seller_id, title, description, price, category, condition, listing_type, location, city)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8::point, $9)
         RETURNING id, title`,
        [
          listing.sellerId,
          listing.title,
          listing.description,
          listing.price,
          listing.category,
          listing.condition,
          listing.listingType,
          listing.location,
          listing.city,
        ],
      );

      const insertedListing = listingResult.rows[0];
      if (!insertedListing) {
        throw new Error(`Failed to insert listing: ${listing.title}`);
      }

      insertedListings.push(insertedListing);

      // Only add image for listings with a location (wanted listings don't need images)
      if (listing.location !== null) {
        await client.query(
          `INSERT INTO listing_images (listing_id, url, position)
           VALUES ($1, $2, 0)`,
          [insertedListing.id, imageUrl],
        );
      }
    }

    console.log(`Created ${insertedListings.length} listings`);

    // --- Reviews ---
    // Ola anmelder Kari — pick a listing by Kari
    const kariListing = insertedListings.find(
      (l) =>
        listingData[insertedListings.indexOf(l)]?.sellerId === kari.id &&
        listingData[insertedListings.indexOf(l)]?.listingType !== 'wanted',
    );

    // Per anmelder Ola — pick a listing by Ola
    const olaListing = insertedListings.find(
      (l) =>
        listingData[insertedListings.indexOf(l)]?.sellerId === ola.id &&
        listingData[insertedListings.indexOf(l)]?.listingType !== 'wanted',
    );

    // Kari anmelder Per — pick a listing by Per
    const perListing = insertedListings.find(
      (l) =>
        listingData[insertedListings.indexOf(l)]?.sellerId === per.id &&
        listingData[insertedListings.indexOf(l)]?.listingType !== 'wanted',
    );

    if (kariListing && olaListing && perListing) {
      await client.query(
        `INSERT INTO reviews (reviewer_id, reviewed_id, listing_id, rating, comment)
         VALUES
           ($1, $2, $3, 5, 'Rask levering!'),
           ($4, $5, $6, 4, 'Varene var som beskrevet')`,
        [
          ola.id,
          kari.id,
          kariListing.id,
          kari.id,
          per.id,
          perListing.id,
        ],
      );
      console.log('Created reviews');

      // Update avg_rating and review_count for reviewed users
      await client.query(
        `UPDATE profiles
         SET avg_rating = sub.avg_r, review_count = sub.cnt
         FROM (
           SELECT reviewed_id, AVG(rating)::numeric(2,1) AS avg_r, COUNT(*) AS cnt
           FROM reviews
           WHERE reviewed_id = ANY($1)
           GROUP BY reviewed_id
         ) sub
         WHERE profiles.id = sub.reviewed_id`,
        [[kari.id, per.id]],
      );
    }

    console.log('Seed complete.');
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
