import { supabase } from '../supabase';
import type {
  ListingCategory,
  ListingCondition,
  ListingType,
  Listing,
  ListingImage,
  Profile,
} from '../types';

export interface ListingWithDetails extends Listing {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'avg_rating' | 'city'>;
  listing_images: Pick<ListingImage, 'id' | 'url' | 'position'>[];
}

export interface FeedParams {
  userLat?: number;
  userLng?: number;
  page: number;
  pageSize: number;
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

const LISTING_SELECT = `
  id,
  seller_id,
  title,
  description,
  price,
  category,
  condition,
  listing_type,
  status,
  location,
  city,
  view_count,
  created_at,
  expires_at,
  profiles!listings_seller_id_fkey (
    id,
    display_name,
    avatar_url,
    avg_rating,
    city
  ),
  listing_images (
    id,
    url,
    position
  )
`.trim();

export async function fetchFeedListings(params: FeedParams): Promise<ListingWithDetails[]> {
  const { userLat, userLng, page, pageSize, type, category } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const hasCoords =
    typeof userLat === 'number' &&
    typeof userLng === 'number' &&
    !isNaN(userLat) &&
    !isNaN(userLng);

  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active');

  if (type) {
    query = query.eq('listing_type', type);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (hasCoords) {
    // Use PostGIS earthdistance ordering via RPC when coordinates are available.
    // The RPC function `listings_near` is expected to return listings sorted by
    // distance from (lat, lng). Fall back to created_at sort if RPC unavailable.
    const { data, error } = await supabase.rpc('listings_near', {
      lat: userLat,
      lng: userLng,
      p_status: 'active',
      p_type: type ?? null,
      p_category: category ?? null,
      p_from: from,
      p_to: to,
    });

    if (!error && data) {
      if (data && data.length > 0 && data[0]?.profiles) {
        return data as ListingWithDetails[];
      }
      // Fall through to regular query if RPC result missing joined data
    }
    // Fall through to default sort on RPC error
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[listings] error:', error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  return (data ?? []) as unknown as ListingWithDetails[];
}

export async function searchListings(params: SearchParams): Promise<ListingWithDetails[]> {
  const { query, page, pageSize, category, minPrice, maxPrice, condition, type } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active');

  if (query.trim().length > 0) {
    // Postgres full-text search on the search_vector column
    q = q.textSearch('search_vector', query.trim(), { type: 'websearch' });
  }

  if (category) {
    q = q.eq('category', category);
  }

  if (typeof minPrice === 'number') {
    q = q.gte('price', minPrice);
  }

  if (typeof maxPrice === 'number') {
    q = q.lte('price', maxPrice);
  }

  if (condition) {
    q = q.eq('condition', condition);
  }

  if (type) {
    q = q.eq('listing_type', type);
  }

  const { data, error } = await q
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[listings] error:', error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  return (data ?? []) as unknown as ListingWithDetails[];
}

export async function fetchListingById(id: string): Promise<ListingWithDetails | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[listings] error:', error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  return data as unknown as ListingWithDetails;
}
