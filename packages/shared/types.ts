// Domain types — camelCase. API layer maps from DB snake_case to these types.

// Enums
export type ListingCategory = 'electronics' | 'clothing' | 'furniture' | 'sports' | 'books' | 'other';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'used' | 'for_parts';
export type ListingType = 'sale' | 'wanted' | 'free';
export type ListingStatus = 'active' | 'sold' | 'expired' | 'deleted';

// Domain types
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

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
  location: string | null; // "(lng,lat)" tuple format
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

// API-specific types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
  statusCode?: number;
}

// Query parameters
export interface FeedParams {
  page: number;
  pageSize: number;
  userLat?: number;
  userLng?: number;
  type?: ListingType;
  category?: ListingCategory;
}

export interface SearchParams {
  query: string;
  page: number;
  pageSize: number;
  category?: ListingCategory;
  minPrice?: number;
  maxPrice?: number;
  condition?: ListingCondition;
  type?: ListingType;
}

// Input types for mutations
export interface CreateListingInput {
  title: string;
  description?: string;
  price?: number;
  category: ListingCategory;
  condition: ListingCondition;
  listingType: ListingType;
  city?: string;
  location?: string;
  imageUrls: string[];
}

export interface CreateReviewInput {
  reviewedId: string;
  listingId: string;
  rating: number;
  comment?: string;
}
