import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Mocks ----

const mockUpload = jest.fn();
const mockApiPost = jest.fn();

jest.mock('../../lib/storage', () => ({
  uploadListingImage: (...args: unknown[]) => mockUpload(...args),
}));

jest.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
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

  it('vellykket opprettelse — kaller uploadListingImage og api.post("/listings")', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 59.9139, longitude: 10.7522 },
    });
    mockReverseGeocodeAsync.mockResolvedValue([{ city: 'Oslo', subregion: null }]);
    mockUpload.mockResolvedValue('https://example.com/img1.jpg');
    mockApiPost.mockResolvedValue({ id: 'listing-abc', title: 'Test annonse' });

    const { result } = renderHook(() => useCreateListing(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // uploadListingImage called once per image
    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockUpload).toHaveBeenCalledWith('file:///img1.jpg');

    // api.post called with listing payload (no seller_id — set server-side)
    expect(mockApiPost).toHaveBeenCalledWith(
      '/listings',
      expect.objectContaining({
        title: 'Test annonse',
        price: 500,
        category: 'electronics',
        condition: 'good',
        listingType: 'sale',
        city: 'Oslo',
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img1.jpg'],
      }),
    );

    // seller_id must NOT be in the request body
    const callBody = mockApiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(callBody).not.toHaveProperty('sellerId');
    expect(callBody).not.toHaveProperty('seller_id');
  });

  it('location-avslag — setter location=null og city=null', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    mockUpload.mockResolvedValue('https://example.com/img1.jpg');
    mockApiPost.mockResolvedValue({ id: 'listing-xyz', title: 'Test annonse' });

    const { result } = renderHook(() => useCreateListing(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiPost).toHaveBeenCalledWith(
      '/listings',
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
    mockUpload.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

    const { result } = renderHook(() => useCreateListing(), {
      wrapper: makeWrapper(),
    });

    result.current.mutate(baseInput);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});
