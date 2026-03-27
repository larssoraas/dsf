// Domain types for torget/.
//
// These types use camelCase to match the Fastify API responses
// (mirroring packages/shared/types.ts which cannot be imported directly
// since torget/ is not yet an npm workspace member).

export type ListingCategory = 'electronics' | 'clothing' | 'furniture' | 'sports' | 'books' | 'other';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'used' | 'for_parts';
export type ListingType = 'sale' | 'wanted' | 'free';
export type ListingStatus = 'active' | 'sold' | 'expired' | 'deleted';

// ─── camelCase API types (canonical) ─────────────────────────────────────────

export interface Profile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  avgRating: number | null;
  reviewCount: number;
  createdAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  price: number | null;
  category: ListingCategory;
  condition: ListingCondition;
  listingType: ListingType;
  status: ListingStatus;
  location: string | null;
  city: string | null;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface ListingImage {
  id: string;
  listingId: string;
  url: string;
  position: number;
  createdAt: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewedId: string;
  listingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ListingWithDetails extends Listing {
  profile: Pick<Profile, 'id' | 'displayName' | 'avatarUrl' | 'avgRating' | 'city'> | null;
  images: ListingImage[];
}

// Auth tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Database type (kept for supabase-js compatibility — will be removed) ────
// TECHNICAL DEBT: Database type below is no longer used after F4 migration.
// Kept here to avoid breaking imports until a cleanup pass removes it.

export type Database = {
  public: {
    Tables: Record<string, never>;
  };
};
