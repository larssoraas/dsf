import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ListingWithDetails } from '@/lib/queries/listings';
import type { ListingCondition, ListingType } from '@/lib/types';

interface Props {
  listing: ListingWithDetails;
}

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'Ny',
  like_new: 'Som ny',
  good: 'God',
  used: 'Brukt',
  for_parts: 'Til deler',
};

const TYPE_LABELS: Record<ListingType, string> = {
  sale: 'Selges',
  wanted: 'Søkes',
  free: 'Gratis',
};

const TYPE_COLORS: Record<ListingType, string> = {
  sale: '#3b82f6',
  wanted: '#8b5cf6',
  free: '#10b981',
};

function formatPrice(price: number | null, type: ListingType): string {
  if (type === 'free') return 'Gratis';
  if (price === null) return 'Pris ikke oppgitt';
  return `${price.toLocaleString('nb-NO')} kr`;
}

export function ListingCard({ listing }: Props) {
  const router = useRouter();
  const firstImage = listing.listing_images
    .slice()
    .sort((a, b) => a.position - b.position)[0];

  const handlePress = () => {
    router.push(`/listing/${listing.id}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={listing.title}
    >
      <View style={styles.imageContainer}>
        {firstImage ? (
          <Image
            source={{ uri: firstImage.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Intet bilde</Text>
          </View>
        )}
        <View
          style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[listing.listing_type] }]}
        >
          <Text style={styles.typeBadgeText}>{TYPE_LABELS[listing.listing_type]}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <Text style={styles.price}>
          {formatPrice(listing.price, listing.listing_type)}
        </Text>

        <View style={styles.meta}>
          {listing.city ? (
            <Text style={styles.city} numberOfLines={1}>
              {listing.city}
            </Text>
          ) : null}
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionBadgeText}>
              {CONDITION_LABELS[listing.condition]}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  city: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  conditionBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionBadgeText: {
    fontSize: 11,
    color: '#374151',
  },
});
