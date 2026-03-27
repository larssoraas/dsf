import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { api } from '../lib/api';
import { uploadListingImage } from '../lib/storage';
import { useAuthStore } from '../store/auth';
import type { ListingCategory, ListingCondition, ListingType, Listing } from '../lib/types';

export interface CreateListingInput {
  images: string[];
  title: string;
  description: string;
  price: string;
  category: ListingCategory;
  condition: ListingCondition;
  listingType: ListingType;
}

interface LocationData {
  coords: string | null;
  city: string | null;
}

async function resolveLocation(): Promise<LocationData> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { coords: null, city: null };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const city = geocode?.city ?? geocode?.subregion ?? null;
    const coords = `(${position.coords.longitude},${position.coords.latitude})`;

    return { coords, city };
  } catch {
    return { coords: null, city: null };
  }
}

async function createListing(input: CreateListingInput): Promise<Listing> {
  const { coords, city } = await resolveLocation();

  const imageUrls = await Promise.all(input.images.map((uri) => uploadListingImage(uri)));

  const price =
    input.listingType === 'sale' && input.price !== '' ? parseFloat(input.price) : null;

  // seller_id is set server-side from the JWT — do not send from client
  const listing = await api.post<Listing>('/listings', {
    title: input.title.trim(),
    description: input.description.trim() || null,
    price,
    category: input.category,
    condition: input.condition,
    listingType: input.listingType,
    location: coords,
    city,
    imageUrls,
  });

  return listing;
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (input: CreateListingInput) => {
      if (!session?.user?.id) {
        throw new Error('Ikke innlogget');
      }
      return createListing(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
