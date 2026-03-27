import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { uploadListingImage } from '../lib/storage';
import { useAuthStore } from '../store/auth';
import type { ListingCategory, ListingCondition, ListingType } from '../lib/types';

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

async function createListing(input: CreateListingInput, sellerId: string) {
  const { coords, city } = await resolveLocation();

  const imageUrls = await Promise.all(
    input.images.map((uri, index) => {
      const filename = `${sellerId}/${crypto.randomUUID()}.jpg`;
      return uploadListingImage(uri, filename);
    }),
  );

  const price =
    input.listingType === 'sale' && input.price !== ''
      ? parseFloat(input.price)
      : null;

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      price,
      category: input.category,
      condition: input.condition,
      listing_type: input.listingType,
      status: 'active',
      location: coords,
      city,
    })
    .select()
    .single();

  if (listingError) {
    throw new Error(`Opprettelse av annonse feilet: ${listingError.message}`);
  }

  if (imageUrls.length > 0) {
    const imageInserts = imageUrls.map((url, position) => ({
      listing_id: listing.id,
      url,
      position,
    }));

    const { error: imagesError } = await supabase
      .from('listing_images')
      .insert(imageInserts);

    if (imagesError) {
      throw new Error(`Lagring av bilder feilet: ${imagesError.message}`);
    }
  }

  return listing;
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (input: CreateListingInput) => {
      const sellerId = session?.user?.id;
      if (!sellerId) {
        throw new Error('Ikke innlogget');
      }
      return createListing(input, sellerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
