import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  customType,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const listingCategory = pgEnum('listing_category', [
  'electronics',
  'clothing',
  'furniture',
  'sports',
  'books',
  'other',
]);

export const listingCondition = pgEnum('listing_condition', [
  'new',
  'like_new',
  'good',
  'used',
  'for_parts',
]);

export const listingType = pgEnum('listing_type', ['sale', 'wanted', 'free']);

export const listingStatus = pgEnum('listing_status', [
  'active',
  'sold',
  'expired',
  'deleted',
]);

// Custom type for PostGIS point (stored as "(lng,lat)" tuple in Postgres)
const point = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'point';
  },
});

// Custom type for tsvector (generated column, read-only)
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

// Tables

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  city: text('city'),
  avgRating: numeric('avg_rating', { precision: 2, scale: 1 }),
  reviewCount: integer('review_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    price: integer('price'),
    category: listingCategory('category').notNull(),
    condition: listingCondition('condition').notNull(),
    listingType: listingType('listing_type').notNull(),
    status: listingStatus('status').notNull().default('active'),
    location: point('location'),
    city: text('city'),
    // Generated tsvector column — managed by Postgres, not set from app
    searchVector: tsvector('search_vector'),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).default(
      sql`now() + interval '30 days'`
    ),
  },
  (table) => [
    index('listings_search_idx').using('gin', sql`${table.searchVector}`),
    index('listings_location_idx').using('gist', sql`${table.location}`),
    index('listings_status_idx').on(table.status),
    index('listings_seller_idx').on(table.sellerId),
  ]
);

export const listingImages = pgTable('listing_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewedId: uuid('reviewed_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check('rating_range', sql`${table.rating} between 1 and 5`),
    check('no_self_review', sql`${table.reviewerId} != ${table.reviewedId}`),
  ]
);

// Type exports for use in route handlers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type ListingImage = typeof listingImages.$inferSelect;
export type NewListingImage = typeof listingImages.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
