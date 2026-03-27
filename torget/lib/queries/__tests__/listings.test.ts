/**
 * Unit tests for lib/queries/listings.ts
 *
 * Strategy: mock lib/api so no real HTTP calls are made.
 * Each test verifies that the correct api.get/post methods are called
 * with the correct arguments.
 */

// ---------------------------------------------------------------------------
// API mock
// ---------------------------------------------------------------------------

const mockApiGet = jest.fn();

jest.mock('../../api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

import { fetchFeedListings, searchListings, fetchListingById } from '../listings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_LISTING = {
  id: 'listing-1',
  sellerId: 'user-1',
  title: 'Brukt sykkel',
  description: null,
  price: 500,
  category: 'sports',
  condition: 'good',
  listingType: 'sale',
  status: 'active',
  location: null,
  city: 'Oslo',
  viewCount: 10,
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-04-01T00:00:00Z',
  profile: { id: 'user-1', displayName: 'Ola', avatarUrl: null, avgRating: 4.5, city: 'Oslo' },
  images: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchFeedListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls api.get("/listings") with page and pageSize', async () => {
    mockApiGet.mockResolvedValue([SAMPLE_LISTING]);

    const result = await fetchFeedListings({ page: 0, pageSize: 20 });

    expect(mockApiGet).toHaveBeenCalledWith('/listings', expect.objectContaining({
      page: 0,
      pageSize: 20,
    }));
    expect(result).toEqual([SAMPLE_LISTING]);
  });

  it('includes userLat and userLng when coordinates are provided', async () => {
    mockApiGet.mockResolvedValue([SAMPLE_LISTING]);

    await fetchFeedListings({ page: 0, pageSize: 20, userLat: 59.9139, userLng: 10.7522 });

    expect(mockApiGet).toHaveBeenCalledWith('/listings', expect.objectContaining({
      userLat: 59.9139,
      userLng: 10.7522,
    }));
  });

  it('omits coordinates when not provided', async () => {
    mockApiGet.mockResolvedValue([]);

    await fetchFeedListings({ page: 0, pageSize: 20 });

    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params).not.toHaveProperty('userLat');
    expect(params).not.toHaveProperty('userLng');
  });

  it('includes type filter when provided', async () => {
    mockApiGet.mockResolvedValue([]);

    await fetchFeedListings({ page: 0, pageSize: 20, type: 'free' });

    expect(mockApiGet).toHaveBeenCalledWith('/listings', expect.objectContaining({ type: 'free' }));
  });

  it('includes category filter when provided', async () => {
    mockApiGet.mockResolvedValue([]);

    await fetchFeedListings({ page: 0, pageSize: 20, category: 'electronics' });

    expect(mockApiGet).toHaveBeenCalledWith('/listings', expect.objectContaining({ category: 'electronics' }));
  });

  it('throws "Noe gikk galt" when api.get fails', async () => {
    mockApiGet.mockRejectedValue(new Error('network error'));

    await expect(fetchFeedListings({ page: 0, pageSize: 20 })).rejects.toThrow('Noe gikk galt');
  });
});

describe('searchListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls api.get("/listings/search") with query and pagination', async () => {
    mockApiGet.mockResolvedValue([SAMPLE_LISTING]);

    await searchListings({ query: 'sykkel', page: 0, pageSize: 20 });

    expect(mockApiGet).toHaveBeenCalledWith('/listings/search', expect.objectContaining({
      query: 'sykkel',
      page: 0,
      pageSize: 20,
    }));
  });

  it('includes all optional filters when provided', async () => {
    mockApiGet.mockResolvedValue([]);

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

    expect(mockApiGet).toHaveBeenCalledWith('/listings/search', expect.objectContaining({
      category: 'sports',
      minPrice: 100,
      maxPrice: 1000,
      condition: 'good',
      type: 'sale',
    }));
  });

  it('omits minPrice/maxPrice when not provided', async () => {
    mockApiGet.mockResolvedValue([]);

    await searchListings({ query: 'bok', page: 0, pageSize: 20 });

    const params = mockApiGet.mock.calls[0][1] as Record<string, unknown>;
    expect(params).not.toHaveProperty('minPrice');
    expect(params).not.toHaveProperty('maxPrice');
  });

  it('paginates correctly (page 1, pageSize 20)', async () => {
    mockApiGet.mockResolvedValue([]);

    await searchListings({ query: 'stol', page: 1, pageSize: 20 });

    expect(mockApiGet).toHaveBeenCalledWith('/listings/search', expect.objectContaining({
      page: 1,
      pageSize: 20,
    }));
  });

  it('throws "Noe gikk galt" when api.get fails', async () => {
    mockApiGet.mockRejectedValue(new Error('search error'));

    await expect(searchListings({ query: 'test', page: 0, pageSize: 20 })).rejects.toThrow('Noe gikk galt');
  });
});

describe('fetchListingById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls api.get("/listings/:id") and returns listing', async () => {
    mockApiGet.mockResolvedValue(SAMPLE_LISTING);

    const result = await fetchListingById('listing-1');

    expect(mockApiGet).toHaveBeenCalledWith('/listings/listing-1');
    expect(result).toEqual(SAMPLE_LISTING);
  });

  it('returns null when api throws a 404 error', async () => {
    mockApiGet.mockRejectedValue(new Error('404 not found'));

    const result = await fetchListingById('nonexistent-id');

    expect(result).toBeNull();
  });

  it('throws "Noe gikk galt" on non-404 errors', async () => {
    mockApiGet.mockRejectedValue(new Error('server error'));

    await expect(fetchListingById('listing-1')).rejects.toThrow('Noe gikk galt');
  });
});
