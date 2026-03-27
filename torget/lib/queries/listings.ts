import { api, ApiError } from '../api';
import type {
  ListingCategory,
  ListingCondition,
  ListingType,
  ListingWithDetails,
} from '../types';

export type { ListingWithDetails };

export interface FeedParams {
  userLat?: number;
  userLng?: number;
  page: number;
  pageSize: number;
  type?: ListingType;
  category?: ListingCategory;
}

export interface MapQueryParams {
  lat: number;
  lng: number;
  radius: number; // km
  page: number;
  pageSize: number;
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

export async function fetchFeedListings(params: FeedParams): Promise<ListingWithDetails[]> {
  const { userLat, userLng, page, pageSize, type, category } = params;

  const hasCoords =
    typeof userLat === 'number' &&
    typeof userLng === 'number' &&
    !isNaN(userLat) &&
    !isNaN(userLng);

  try {
    return await api.get<ListingWithDetails[]>('/listings', {
      page,
      pageSize,
      ...(hasCoords ? { userLat, userLng } : {}),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
    });
  } catch (err) {
    console.error('[listings] fetchFeedListings error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function searchListings(params: SearchParams): Promise<ListingWithDetails[]> {
  const { query, page, pageSize, category, minPrice, maxPrice, condition, type } = params;

  try {
    return await api.get<ListingWithDetails[]>('/listings/search', {
      query,
      page,
      pageSize,
      ...(category ? { category } : {}),
      ...(typeof minPrice === 'number' ? { minPrice } : {}),
      ...(typeof maxPrice === 'number' ? { maxPrice } : {}),
      ...(condition ? { condition } : {}),
      ...(type ? { type } : {}),
    });
  } catch (err) {
    console.error('[listings] searchListings error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function fetchMapListings(params: MapQueryParams): Promise<ListingWithDetails[]> {
  const { lat, lng, radius, page, pageSize } = params;

  try {
    return await api.get<ListingWithDetails[]>('/listings', {
      userLat: lat,
      userLng: lng,
      radius,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('[listings] fetchMapListings error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function fetchListingById(id: string): Promise<ListingWithDetails | null> {
  try {
    return await api.get<ListingWithDetails>(`/listings/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    console.error('[listings] fetchListingById error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}
