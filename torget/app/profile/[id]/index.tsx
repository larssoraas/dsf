import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { usePublicProfile } from '@/hooks/useProfile';
import { useReviews } from '@/hooks/useReviews';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ReviewList } from '@/components/profile/ReviewList';
import { useAuthStore } from '@/store/auth';
import type { Listing } from '@/lib/types';

function formatPrice(price: number | null, type: Listing['listing_type']): string {
  if (type === 'free') return 'Gratis';
  if (price === null) return 'Pris ikke oppgitt';
  return `${price.toLocaleString('nb-NO')} kr`;
}

function ActiveListingRow({ listing }: { listing: Listing }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.listingRow}
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={listing.title}
    >
      <Text style={styles.listingTitle} numberOfLines={1}>
        {listing.title}
      </Text>
      <Text style={styles.listingPrice}>
        {formatPrice(listing.price, listing.listing_type)}
      </Text>
    </TouchableOpacity>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();

  const profileQuery = usePublicProfile(id ?? '');
  const reviewsQuery = useReviews(id ?? '');

  const isOwnProfile = session?.user?.id === id;

  if (profileQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profil', headerBackTitle: 'Tilbake' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profil', headerBackTitle: 'Tilbake' }} />
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Kunne ikke laste profilen</Text>
          <Text style={styles.errorText}>Prøv igjen litt senere.</Text>
        </View>
      </>
    );
  }

  const { profile, activeListings } = profileQuery.data;
  const reviews = reviewsQuery.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{ title: profile.display_name, headerBackTitle: 'Tilbake' }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

        {activeListings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aktive annonser</Text>
            <FlatList
              data={activeListings}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => <ActiveListingRow listing={item} />}
              ListEmptyComponent={<Text style={styles.emptyText}>Ingen aktive annonser</Text>}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Anmeldelser ({profile.review_count})
          </Text>
          {reviewsQuery.isLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" style={styles.reviewsLoader} />
          ) : (
            <ReviewList reviews={reviews} />
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  listingRow: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  listingPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  reviewsLoader: {
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
