import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchListings } from '@/lib/queries/listings';
import type { ListingCategory, ListingCondition, ListingType } from '@/lib/types';

export interface SearchFilters {
  category?: ListingCategory;
  minPrice?: number;
  maxPrice?: number;
  condition?: ListingCondition;
  type?: ListingType;
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function useSearch() {
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [searchText]);

  const isEnabled = debouncedQuery.trim().length > 0 || Object.keys(filters).length > 0;

  const query = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: () =>
      searchListings({
        query: debouncedQuery,
        page: 0,
        pageSize: PAGE_SIZE,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        condition: filters.condition,
        type: filters.type,
      }),
    enabled: isEnabled,
    staleTime: 30_000,
  });

  const listings = query.data ?? [];

  return {
    searchText,
    setSearchText,
    listings,
    isLoading: query.isLoading && isEnabled,
    filters,
    setFilters,
    clearFilters: () => setFilters({}),
    activeFilterCount: Object.values(filters).filter((v) => v !== undefined).length,
  };
}
