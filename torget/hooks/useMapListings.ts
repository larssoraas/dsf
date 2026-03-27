import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMapListings } from '@/lib/queries/listings';
import type { ListingWithDetails } from '@/lib/types';

export interface MapParams {
  lat: number;
  lng: number;
  radius: number; // km
}

const DEFAULT_RADIUS_KM = 10;
const PAGE_SIZE = 50;

interface UseMapListingsParams {
  lat: number | null;
  lng: number | null;
}

interface UseMapListingsResult {
  listings: ListingWithDetails[];
  isLoading: boolean;
  isError: boolean;
  radius: number;
  setRadius: (radius: number) => void;
  refetch: () => void;
}

/**
 * Parse a Postgres "(lng,lat)" point string into { lat, lng } numbers.
 * Returns null if the string cannot be parsed.
 */
export function parseLocationString(location: string): { lat: number; lng: number } | null {
  try {
    const cleaned = location.replace('(', '').replace(')', '');
    const parts = cleaned.split(',');
    if (parts.length !== 2) return null;
    const lng = parseFloat(parts[0]!);
    const lat = parseFloat(parts[1]!);
    if (isNaN(lng) || isNaN(lat)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function useMapListings({ lat, lng }: UseMapListingsParams): UseMapListingsResult {
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS_KM);

  const query = useQuery({
    queryKey: ['map-listings', lat, lng, radius],
    queryFn: () =>
      fetchMapListings({
        lat: lat!,
        lng: lng!,
        radius,
        page: 1,
        pageSize: PAGE_SIZE,
      }),
    enabled: lat !== null && lng !== null,
  });

  return {
    listings: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    radius,
    setRadius,
    refetch: query.refetch,
  };
}
