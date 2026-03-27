import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db';
import { listings, listingImages, profiles } from '../../drizzle/schema';
import { eq, and, sql, gte, lte, ilike } from 'drizzle-orm';
import type { CreateListingInput, ListingCategory, ListingCondition, ListingType } from '@torget/shared';

interface FeedQuery {
  page?: string;
  pageSize?: string;
  userLat?: string;
  userLng?: string;
  type?: ListingType;
  category?: ListingCategory;
}

interface SearchQuery {
  query?: string;
  page?: string;
  pageSize?: string;
  category?: ListingCategory;
  minPrice?: string;
  maxPrice?: string;
  condition?: ListingCondition;
  type?: ListingType;
}

interface ListingParams {
  id: string;
}

export async function listingsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /listings — anonymous feed
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: FeedQuery }>,
      reply: FastifyReply,
    ) => {
      const page = Math.max(1, parseInt(request.query.page ?? '1', 10));
      const pageSize = Math.min(
        50,
        Math.max(1, parseInt(request.query.pageSize ?? '20', 10)),
      );
      const offset = (page - 1) * pageSize;
      const { userLat, userLng, type, category } = request.query;

      const hasCoordinates =
        userLat !== undefined &&
        userLng !== undefined &&
        !isNaN(parseFloat(userLat)) &&
        !isNaN(parseFloat(userLng));

      if (hasCoordinates) {
        // Use PostGIS earthdistance for proximity sort
        const lat = parseFloat(userLat!); // Non-null: checked by hasCoordinates
        const lng = parseFloat(userLng!); // Non-null: checked by hasCoordinates

        const typeFilter = type ? sql`AND l.listing_type = ${type}::listing_type` : sql``;
        const categoryFilter = category ? sql`AND l.category = ${category}::listing_category` : sql``;

        const rows = await db.execute<Record<string, unknown>>(sql`
          SELECT
            l.*,
            p.id AS profile_id,
            p.display_name AS profile_display_name,
            p.avatar_url AS profile_avatar_url,
            p.avg_rating AS profile_avg_rating,
            p.city AS profile_city,
            json_agg(
              json_build_object('id', li.id, 'url', li.url, 'position', li.position)
              ORDER BY li.position
            ) FILTER (WHERE li.id IS NOT NULL) AS images
          FROM listings l
          LEFT JOIN profiles p ON p.id = l.seller_id
          LEFT JOIN listing_images li ON li.listing_id = l.id
          WHERE l.status = 'active'
            ${typeFilter}
            ${categoryFilter}
          GROUP BY l.id, p.id
          ORDER BY earth_distance(
            ll_to_earth(${lat}, ${lng}),
            ll_to_earth(
              CAST(SPLIT_PART(l.location::text, ',', 2) AS float),
              CAST(TRIM(LEADING '(' FROM SPLIT_PART(l.location::text, ',', 1)) AS float)
            )
          ) ASC NULLS LAST,
          l.created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `);

        return reply.send({ data: rows.rows.map(mapListingRow) });
      }

      // Default: most recent first
      const conditions = [eq(listings.status, 'active')];
      if (type) conditions.push(eq(listings.listingType, type));
      if (category) conditions.push(eq(listings.category, category));

      const rows = await db
        .select({
          listing: listings,
          profile: {
            id: profiles.id,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
            avgRating: profiles.avgRating,
            city: profiles.city,
          },
        })
        .from(listings)
        .leftJoin(profiles, eq(profiles.id, listings.sellerId))
        .where(and(...conditions))
        .orderBy(sql`${listings.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      // Fetch images for each listing
      const listingIds = rows.map((r) => r.listing.id);
      const images =
        listingIds.length > 0
          ? await db
              .select()
              .from(listingImages)
              .where(sql`${listingImages.listingId} = ANY(${listingIds})`)
              .orderBy(listingImages.position)
          : [];

      const imagesByListing = new Map<string, typeof images>();
      for (const img of images) {
        const existing = imagesByListing.get(img.listingId) ?? [];
        existing.push(img);
        imagesByListing.set(img.listingId, existing);
      }

      const data = rows.map((row) => ({
        ...row.listing,
        profile: row.profile,
        images: imagesByListing.get(row.listing.id) ?? [],
      }));

      return reply.send({ data });
    },
  );

  // GET /listings/search — full-text + filter search
  fastify.get(
    '/search',
    async (
      request: FastifyRequest<{ Querystring: SearchQuery }>,
      reply: FastifyReply,
    ) => {
      const page = Math.max(1, parseInt(request.query.page ?? '1', 10));
      const pageSize = Math.min(
        50,
        Math.max(1, parseInt(request.query.pageSize ?? '20', 10)),
      );
      const offset = (page - 1) * pageSize;
      const { query, category, minPrice, maxPrice, condition, type } =
        request.query;

      const conditions = [eq(listings.status, 'active')];

      if (query && query.trim().length > 0) {
        conditions.push(
          sql`${listings.searchVector} @@ websearch_to_tsquery('norwegian', ${query.trim()})`,
        );
      }

      if (category) conditions.push(eq(listings.category, category));
      if (condition) conditions.push(eq(listings.condition, condition));
      if (type) conditions.push(eq(listings.listingType, type));
      if (minPrice !== undefined && !isNaN(parseInt(minPrice, 10))) {
        conditions.push(gte(listings.price, parseInt(minPrice, 10)));
      }
      if (maxPrice !== undefined && !isNaN(parseInt(maxPrice, 10))) {
        conditions.push(lte(listings.price, parseInt(maxPrice, 10)));
      }

      const rows = await db
        .select({
          listing: listings,
          profile: {
            id: profiles.id,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
            avgRating: profiles.avgRating,
            city: profiles.city,
          },
        })
        .from(listings)
        .leftJoin(profiles, eq(profiles.id, listings.sellerId))
        .where(and(...conditions))
        .orderBy(sql`${listings.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      const listingIds = rows.map((r) => r.listing.id);
      const images =
        listingIds.length > 0
          ? await db
              .select()
              .from(listingImages)
              .where(sql`${listingImages.listingId} = ANY(${listingIds})`)
              .orderBy(listingImages.position)
          : [];

      const imagesByListing = new Map<string, typeof images>();
      for (const img of images) {
        const existing = imagesByListing.get(img.listingId) ?? [];
        existing.push(img);
        imagesByListing.set(img.listingId, existing);
      }

      const data = rows.map((row) => ({
        ...row.listing,
        profile: row.profile,
        images: imagesByListing.get(row.listing.id) ?? [],
      }));

      return reply.send({ data });
    },
  );

  // GET /listings/:id — single listing detail
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: ListingParams }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;

      const rows = await db
        .select({
          listing: listings,
          profile: {
            id: profiles.id,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
            avgRating: profiles.avgRating,
            city: profiles.city,
          },
        })
        .from(listings)
        .leftJoin(profiles, eq(profiles.id, listings.sellerId))
        .where(eq(listings.id, id))
        .limit(1);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Listing not found' });
      }

      const images = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, id))
        .orderBy(listingImages.position);

      const row = rows[0]!; // Non-null: length checked above

      // Fire-and-forget view count increment — intentionally not awaited
      void db
        .update(listings)
        .set({ viewCount: sql`${listings.viewCount} + 1` })
        .where(eq(listings.id, id))
        .catch((err: Error) => {
          console.error('Failed to increment view count:', err.message);
        });

      return reply.send({
        data: {
          ...row.listing,
          profile: row.profile,
          images,
        },
      });
    },
  );

  // POST /listings — create listing (requires auth)
  fastify.post<{ Body: CreateListingInput }>(
    '/',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const {
        title,
        description,
        price,
        category,
        condition,
        listingType,
        city,
        location,
        imageUrls,
      } = request.body;

      if (!title || title.trim().length === 0 || title.trim().length > 200) {
        return reply
          .code(400)
          .send({ error: 'Title must be between 1 and 200 characters' });
      }

      if (imageUrls && imageUrls.length > 5) {
        return reply
          .code(400)
          .send({ error: 'Maximum 5 images allowed per listing' });
      }

      const sellerId = request.user.id;

      const [newListing] = await db
        .insert(listings)
        .values({
          sellerId,
          title: title.trim(),
          description: description ?? null,
          price: price ?? null,
          category,
          condition,
          listingType,
          city: city ?? null,
          location: location ?? null,
        })
        .returning();

      if (!newListing) {
        console.error('Failed to create listing: no row returned');
        return reply.code(500).send({ error: 'Failed to create listing' });
      }

      if (imageUrls && imageUrls.length > 0) {
        await db.insert(listingImages).values(
          imageUrls.map((url, idx) => ({
            listingId: newListing.id,
            url,
            position: idx,
          })),
        );
      }

      return reply.code(201).send({ data: newListing });
    },
  );

  // PATCH /listings/:id/sold — mark as sold (requires ownership)
  fastify.patch<{ Params: ListingParams }>(
    '/:id/sold',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.id;

      // Check existence first, then ownership separately for correct status codes
      const [existing] = await db
        .select({ id: listings.id, sellerId: listings.sellerId })
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ error: 'Listing not found' });
      }

      if (existing.sellerId !== userId) {
        return reply.code(403).send({ error: 'Forbidden: not the listing owner' });
      }

      const [updated] = await db
        .update(listings)
        .set({ status: 'sold' })
        .where(and(eq(listings.id, id), eq(listings.sellerId, userId)))
        .returning({ id: listings.id, status: listings.status });

      if (!updated) {
        console.error('Failed to update listing status');
        return reply.code(500).send({ error: 'Failed to update listing' });
      }

      return reply.send({ data: { id: updated.id, status: updated.status } });
    },
  );
}

// Helper: map raw SQL row (from geo query) to a consistent shape
function mapListingRow(row: Record<string, unknown>) {
  return {
    id: row['id'],
    sellerId: row['seller_id'],
    title: row['title'],
    description: row['description'] ?? null,
    price: row['price'] ?? null,
    category: row['category'],
    condition: row['condition'],
    listingType: row['listing_type'],
    status: row['status'],
    location: row['location'] ?? null,
    city: row['city'] ?? null,
    viewCount: row['view_count'],
    createdAt: row['created_at'],
    expiresAt: row['expires_at'] ?? null,
    profile: row['profile_id']
      ? {
          id: row['profile_id'],
          displayName: row['profile_display_name'] ?? null,
          avatarUrl: row['profile_avatar_url'] ?? null,
          avgRating: row['profile_avg_rating'] ?? null,
          city: row['profile_city'] ?? null,
        }
      : null,
    images: (row['images'] as Array<Record<string, unknown>> | null) ?? [],
  };
}
