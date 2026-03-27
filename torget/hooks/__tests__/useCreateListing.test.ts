import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Mocks ----

const mockUpload = jest.fn();
const mockInsert = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../lib/storage', () => ({
  uploadListingImage: (...args: unknown[]) => mockUpload(...args),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockGetCurrentPositionAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestForegroundPermissionsAsync(),
  getCurrentPositionAsync: () => mockGetCurrentPositionAsync(),
  reverseGeocodeAsync: () => mockReverseGeocodeAsync(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../store/auth', () => ({
  useAuthStore: () => ({
    session: { user: { id: 'user-123' } },
  }),
}));

import { useCreateListing } from '../useCreateListing';

// ---- Test setup ----

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

function setupSupabaseMock(listingData: object) {
  const selectMock = jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({ data: listingData, error: null }),
  });
  mockInsert.mockReturnValue({ select: selectMock });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listings') return { insert: mockInsert };
    if (table === 'listing_images') return { insert: jest.fn().mockResolvedValue({ error: null }) };
    return {};
  });
}

const baseInput = {
  images: ['file:///img1.jpg', 'file:///img2.jpg'],
  title: 'Test annonse',
  description: 'Beskrivelse',
  price: '500',
  category: 'electronics' as const,
  condition: 'good' as const,
  listingType: 'sale' as const,
};

// ---- Tests ----

describe('useCreateListing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('vellykket opprettelse — kaller supabase insert med riktige data', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 59.9139, longitude: 10.7522 },
    });
    mockReverseGeocodeAsync.mockResolvedValue([{ city: 'Oslo', subregion: null }]);
    mockUpload.mockResolvedValue('https://example.com/img1.jpg');

    const listing = { id: 'listing-abc', title: 'Test annonse' };
    setupSupabaseMock(listing);

    const { result } = renderHook(() => useCreateListing(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        seller_id: 'user-123',
        title: 'Test annonse',
        price: 500,
        category: 'electronics',
        condition: 'good',
        listing_type: 'sale',
        city: 'Oslo',
      }),
    );
  });

  it('location-avslag — setter location=null og city=null (ingen krasj)', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockUpload.mockResolvedValue('https://example.com/img1.jpg');

    const listing = { id: 'listing-xyz', title: 'Test annonse' };
    setupSupabaseMock(listing);

    const { result } = renderHook(() => useCreateListing(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        location: null,
        city: null,
      }),
    );
  });

  it('bilde-upload feil — propagerer feil til mutation', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 59.9139, longitude: 10.7522 },
    });
    mockReverseGeocodeAsync.mockResolvedValue([{ city: 'Oslo', subregion: null }]);
    mockUpload.mockRejectedValue(new Error('Bilde-upload feilet: network error'));

    const { result } = renderHook(() => useCreateListing(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
