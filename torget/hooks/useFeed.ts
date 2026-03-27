import { useState, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { fetchFeedListings } from '@/lib/queries/listings';
import type { ListingCategory, ListingType } from '@/lib/types';

interface UserLocation {
  lat: number;
  lng: number;
}

interface FeedFilters {
  type?: ListingType;
  category?: ListingCategory;
}

const PAGE_SIZE = 20;

export function useFeed() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>({});

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // Could not get location — feed will sort by created_at
      }
    })();
  }, []);

  const query = useInfiniteQuery({
    queryKey: ['feed', location, filters],
    queryFn: ({ pageParam }) =>
      fetchFeedListings({
        userLat: location?.lat,
        userLng: location?.lng,
        page: pageParam as number,
        pageSize: PAGE_SIZE,
        type: filters.type,
        category: filters.category,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });

  const listings = query.data?.pages.flat() ?? [];

  return {
    listings,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    locationDenied,
    filters,
    setFilters,
  };
}
