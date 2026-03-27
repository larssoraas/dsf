// Supabase database types (manually maintained until supabase gen types is run)
// NOTE: These snake_case types are for the existing Supabase-based app (torget/).
// The canonical camelCase domain types live in /packages/shared/types.ts and
// will replace these in F4 when torget/ moves to apps/mobile/.

export type ListingCategory = 'electronics' | 'clothing' | 'furniture' | 'sports' | 'books' | 'other';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'used' | 'for_parts';
export type ListingType = 'sale' | 'wanted' | 'free';
export type ListingStatus = 'active' | 'sold' | 'expired' | 'deleted';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  avg_rating: number;
  review_count: number;
  created_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number | null;
  category: ListingCategory;
  condition: ListingCondition;
  listing_type: ListingType;
  status: ListingStatus;
  location: string | null;
  city: string | null;
  view_count: number;
  created_at: string;
  expires_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  listing_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'avg_rating' | 'review_count' | 'created_at'> &
          Partial<Pick<Profile, 'avg_rating' | 'review_count' | 'created_at'>>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      listings: {
        Row: Listing;
        Insert: Omit<Listing, 'id' | 'view_count' | 'created_at' | 'expires_at'> &
          Partial<Pick<Listing, 'id' | 'view_count' | 'created_at' | 'expires_at'>>;
        Update: Partial<Omit<Listing, 'id' | 'seller_id'>>;
      };
      listing_images: {
        Row: ListingImage;
        Insert: Omit<ListingImage, 'id' | 'created_at'> &
          Partial<Pick<ListingImage, 'id' | 'created_at'>>;
        Update: Partial<Omit<ListingImage, 'id' | 'listing_id'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'> & Partial<Pick<Review, 'id' | 'created_at'>>;
        Update: never;
      };
    };
  };
};
