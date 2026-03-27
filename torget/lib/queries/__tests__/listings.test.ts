/**
 * Unit tests for lib/queries/listings.ts
 *
 * Strategy: mock the supabase module so no real HTTP calls are made.
 * Each test verifies that the correct Supabase builder methods are called
 * with the correct arguments.
 */

// ---------------------------------------------------------------------------
// Types for the chainable mock builder
// ---------------------------------------------------------------------------
interface MockBuilder {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  textSearch: jest.Mock;
  single: jest.Mock;
  // resolved value
  _resolve: (value: { data: unknown; error: null | { message: string; code?: string } }) => void;
}

// ---------------------------------------------------------------------------
// Build a chainable mock that resolves at the end of the chain
// ---------------------------------------------------------------------------
function makeMockBuilder(resolvedValue: { data: unknown; error: null | { message: string; code?: string } }): MockBuilder {
  let resolver: (value: { data: unknown; error: null | { message: string; code?: string } }) => void = () => {};
  const promise = new Promise<{ data: unknown; error: null | { message: string; code?: string } }>((resolve) => {
    resolver = resolve;
  });

  const chain: MockBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockImplementation(
      () => promise
    ),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => promise),
    _resolve: resolver,
  };

  // Immediately resolve so tests don't hang
  resolver(resolvedValue);

  return chain;
}

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { fetchFeedListings, searchListings, fetchListingById } from '../listings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SAMPLE_LISTING = {
  id: 'listing-1',
  seller_id: 'user-1',
  title: 'Brukt sykkel',
  description: null,
  price: 500,
  category: 'sports',
  condition: 'good',
  listing_type: 'sale',
  status: 'active',
  location: null,
  city: 'Oslo',
  view_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-04-01T00:00:00Z',
  profiles: { id: 'user-1', display_name: 'Ola', avatar_url: null, avg_rating: 4.5, city: 'Oslo' },
  listing_images: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('fetchFeedListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to created_at sort when no coordinates are provided', async () => {
    const builder = makeMockBuilder({ data: [SAMPLE_LISTING], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    const result = await fetchFeedListings({ page: 0, pageSize: 20 });

    // Should NOT call rpc for geo sorting
    expect(mockRpc).not.toHaveBeenCalled();

    // Should call .from('listings')
    expect(mockFrom).toHaveBeenCalledWith('listings');

    // Should filter by status = 'active'
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');

    // Should sort by created_at descending
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });

    // Should paginate correctly (page 0, pageSize 20 → range 0..19)
    expect(builder.range).toHaveBeenCalledWith(0, 19);

    expect(result).toEqual([SAMPLE_LISTING]);
  });

  it('calls rpc listings_near with coordinates when provided', async () => {
    // RPC succeeds
    mockRpc.mockResolvedValue({ data: [SAMPLE_LISTING], error: null });
    // Also set up a builder in case fallback is triggered
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    const result = await fetchFeedListings({
      userLat: 59.9139,
      userLng: 10.7522,
      page: 0,
      pageSize: 20,
    });

    expect(mockRpc).toHaveBeenCalledWith('listings_near', {
      lat: 59.9139,
      lng: 10.7522,
      p_status: 'active',
      p_type: null,
      p_category: null,
      p_from: 0,
      p_to: 19,
    });

    expect(result).toEqual([SAMPLE_LISTING]);
  });

  it('falls back to created_at sort when rpc fails', async () => {
    // RPC fails
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function not found' } });

    const builder = makeMockBuilder({ data: [SAMPLE_LISTING], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    const result = await fetchFeedListings({
      userLat: 59.9139,
      userLng: 10.7522,
      page: 0,
      pageSize: 20,
    });

    // Falls back to regular query
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([SAMPLE_LISTING]);
  });

  it('applies type filter when provided', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await fetchFeedListings({ page: 0, pageSize: 20, type: 'free' });

    expect(builder.eq).toHaveBeenCalledWith('listing_type', 'free');
  });

  it('applies category filter when provided', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await fetchFeedListings({ page: 0, pageSize: 20, category: 'electronics' });

    expect(builder.eq).toHaveBeenCalledWith('category', 'electronics');
  });

  it('calculates correct range for page 2', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await fetchFeedListings({ page: 2, pageSize: 20 });

    // page 2, pageSize 20 → from 40, to 59
    expect(builder.range).toHaveBeenCalledWith(40, 59);
  });

  it('throws when supabase returns an error', async () => {
    const builder = makeMockBuilder({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(builder);

    // static import above

    await expect(fetchFeedListings({ page: 0, pageSize: 20 })).rejects.toThrow('Noe gikk galt');
  });
});

describe('searchListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls textSearch with query string', async () => {
    const builder = makeMockBuilder({ data: [SAMPLE_LISTING], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await searchListings({ query: 'sykkel', page: 0, pageSize: 20 });

    expect(builder.textSearch).toHaveBeenCalledWith('search_vector', 'sykkel', { type: 'websearch' });
  });

  it('skips textSearch when query is empty', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await searchListings({ query: '  ', page: 0, pageSize: 20 });

    expect(builder.textSearch).not.toHaveBeenCalled();
  });

  it('applies all filters: category, minPrice, maxPrice, condition, type', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await searchListings({
      query: 'sykkel',
      page: 0,
      pageSize: 20,
      category: 'sports',
      minPrice: 100,
      maxPrice: 1000,
      condition: 'good',
      type: 'sale',
    });

    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    expect(builder.eq).toHaveBeenCalledWith('category', 'sports');
    expect(builder.eq).toHaveBeenCalledWith('condition', 'good');
    expect(builder.eq).toHaveBeenCalledWith('listing_type', 'sale');
    expect(builder.gte).toHaveBeenCalledWith('price', 100);
    expect(builder.lte).toHaveBeenCalledWith('price', 1000);
  });

  it('does not apply minPrice/maxPrice when not provided', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await searchListings({ query: 'bok', page: 0, pageSize: 20 });

    expect(builder.gte).not.toHaveBeenCalled();
    expect(builder.lte).not.toHaveBeenCalled();
  });

  it('paginates correctly', async () => {
    const builder = makeMockBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    await searchListings({ query: 'stol', page: 1, pageSize: 20 });

    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it('throws when supabase returns an error', async () => {
    const builder = makeMockBuilder({ data: null, error: { message: 'Search error' } });
    mockFrom.mockReturnValue(builder);

    // static import above

    await expect(searchListings({ query: 'test', page: 0, pageSize: 20 })).rejects.toThrow('Noe gikk galt');
  });
});

describe('fetchListingById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns listing when found', async () => {
    const builder = makeMockBuilder({ data: SAMPLE_LISTING, error: null });
    mockFrom.mockReturnValue(builder);

    // static import above

    const result = await fetchListingById('listing-1');

    expect(builder.eq).toHaveBeenCalledWith('id', 'listing-1');
    expect(result).toEqual(SAMPLE_LISTING);
  });

  it('returns null on PGRST116 (not found)', async () => {
    const builder = makeMockBuilder({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
    mockFrom.mockReturnValue(builder);

    // static import above

    const result = await fetchListingById('nonexistent-id');

    expect(result).toBeNull();
  });

  it('throws on other errors', async () => {
    const builder = makeMockBuilder({ data: null, error: { message: 'DB error', code: '42P01' } });
    mockFrom.mockReturnValue(builder);

    // static import above

    await expect(fetchListingById('listing-1')).rejects.toThrow('Noe gikk galt');
  });
});
