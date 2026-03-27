import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFeed } from '@/hooks/useFeed';
import { ListingCard } from '@/components/listing/ListingCard';
import type { ListingWithDetails } from '@/lib/queries/listings';
import type { ListingCategory, ListingType } from '@/lib/types';

const TYPE_TABS: { value: ListingType | undefined; label: string }[] = [
  { value: undefined, label: 'Alle' },
  { value: 'sale', label: 'Selges' },
  { value: 'wanted', label: 'Søkes' },
  { value: 'free', label: 'Gratis' },
];

const CATEGORY_TABS: { value: ListingCategory | undefined; label: string }[] = [
  { value: undefined, label: 'Alle' },
  { value: 'electronics', label: 'Elektronikk' },
  { value: 'clothing', label: 'Klær' },
  { value: 'furniture', label: 'Møbler' },
  { value: 'sports', label: 'Sport' },
  { value: 'books', label: 'Bøker' },
  { value: 'other', label: 'Annet' },
];

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Ingen annonser funnet</Text>
      <Text style={styles.emptyText}>Prøv å endre filtrene, eller kom tilbake senere.</Text>
    </View>
  );
}

export default function FeedScreen() {
  const {
    listings,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    locationDenied,
    filters,
    setFilters,
  } = useFeed();

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: ListingWithDetails }) => (
    <ListingCard listing={item} />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {locationDenied && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>
            Stedstilgang avslått — viser nyeste annonser
          </Text>
        </View>
      )}

      {/* Type filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TYPE_TABS}
          keyExtractor={(item) => item.value ?? 'all-types'}
          contentContainerStyle={styles.filterRowContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                filters.type === item.value && styles.filterTabActive,
              ]}
              onPress={() => setFilters((prev) => ({ ...prev, type: item.value }))}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterTabText,
                  filters.type === item.value && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Category filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_TABS}
          keyExtractor={(item) => item.value ?? 'all-cats'}
          contentContainerStyle={styles.filterRowContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                filters.category === item.value && styles.filterTabActive,
              ]}
              onPress={() => setFilters((prev) => ({ ...prev, category: item.value }))}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterTabText,
                  filters.category === item.value && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            listings.length === 0 && styles.listContentEmpty,
          ]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={EmptyState}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  locationBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationBannerText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
  filterRow: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterRowContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  listContentEmpty: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
