import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRef, useState } from 'react';
import type { ListingWithDetails } from '@/lib/queries/listings';
import type { ListingCategory, ListingCondition, ListingType } from '@/lib/types';

interface Props {
  listing: ListingWithDetails;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'Ny',
  like_new: 'Som ny',
  good: 'God stand',
  used: 'Brukt',
  for_parts: 'Til deler',
};

const TYPE_LABELS: Record<ListingType, string> = {
  sale: 'Selges',
  wanted: 'Søkes',
  free: 'Gratis',
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  electronics: 'Elektronikk',
  clothing: 'Klær',
  furniture: 'Møbler',
  sports: 'Sport',
  books: 'Bøker',
  other: 'Annet',
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ListingDetail({ listing }: Props) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const sortedImages = listing.listing_images
    .slice()
    .sort((a, b) => a.position - b.position);

  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image gallery */}
      <View style={styles.galleryContainer}>
        {sortedImages.length > 0 ? (
          <>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleImageScroll}
            >
              {sortedImages.map((img) => (
                <Image
                  key={img.id}
                  source={{ uri: img.url }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {sortedImages.length > 1 && (
              <View style={styles.pagination}>
                {sortedImages.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeImageIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Ingen bilder</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: TYPE_COLORS[listing.listing_type] }]}>
            <Text style={styles.badgeTextWhite}>{TYPE_LABELS[listing.listing_type]}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{CONDITION_LABELS[listing.condition]}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{CATEGORY_LABELS[listing.category]}</Text>
          </View>
        </View>

        {/* Title and price */}
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{formatPrice(listing.price, listing.listing_type)}</Text>

        {/* Seller snippet */}
        <View style={styles.sellerCard}>
          <View style={styles.sellerAvatar}>
            {listing.profiles?.avatar_url ? (
              <Image
                source={{ uri: listing.profiles.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {listing.profiles?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{listing.profiles?.display_name}</Text>
            <View style={styles.sellerMeta}>
              <Text style={styles.sellerRating}>
                {'★'} {listing.profiles?.avg_rating?.toFixed(1)}
              </Text>
              {listing.profiles?.city ? (
                <Text style={styles.sellerCity}> · {listing.profiles.city}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Description */}
        {listing.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beskrivelse</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detaljer</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lagt ut</Text>
            <Text style={styles.detailValue}>{formatDate(listing.created_at)}</Text>
          </View>
          {listing.city ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sted</Text>
              <Text style={styles.detailValue}>{listing.city}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Visninger</Text>
            <Text style={styles.detailValue}>{listing.view_count}</Text>
          </View>
        </View>

        {/* Contact button — placeholder for F4 */}
        <TouchableOpacity
          style={styles.contactButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Kontakt selger"
        >
          <Text style={styles.contactButtonText}>Kontakt selger</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  galleryContainer: {
    backgroundColor: '#000',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 16,
  },
  content: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  badgeTextWhite: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1d4ed8',
    marginBottom: 16,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sellerAvatar: {},
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerRating: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  sellerCity: {
    fontSize: 13,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  contactButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
