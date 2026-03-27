import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSearch } from '@/hooks/useSearch';
import { FilterSheet } from '@/components/search/FilterSheet';
import { ListingCard } from '@/components/listing/ListingCard';
import type { ListingWithDetails } from '@/lib/queries/listings';

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <View style={styles.emptyContainer}>
      {hasQuery ? (
        <>
          <Text style={styles.emptyTitle}>Ingen treff</Text>
          <Text style={styles.emptyText}>Prøv andre søkeord eller juster filtrene.</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Søk etter annonser</Text>
          <Text style={styles.emptyText}>Skriv inn søkeord eller bruk filtre.</Text>
        </>
      )}
    </View>
  );
}

export default function SearchScreen() {
  const {
    searchText,
    setSearchText,
    listings,
    isLoading,
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
  } = useSearch();

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const isActive = searchText.trim().length > 0 || activeFilterCount > 0;

  const renderItem = ({ item }: { item: ListingWithDetails }) => (
    <ListingCard listing={item} />
  );

  return (
    <View style={styles.container}>
      {/* Search bar row */}
      <View style={styles.searchBar}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Søk etter annonser..."
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Søkefelt"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              accessibilityRole="button"
              accessibilityLabel="Slett søketekst"
            >
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Åpne filtre"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? '#ffffff' : '#374151'}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>
            {activeFilterCount} aktiv{activeFilterCount !== 1 ? 'e' : ''} filter
            {activeFilterCount !== 1 ? 'e' : ''}
          </Text>
          <TouchableOpacity onPress={clearFilters} accessibilityRole="button">
            <Text style={styles.clearFiltersText}>Nullstill alle</Text>
          </TouchableOpacity>
        </View>
      )}

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
          ListEmptyComponent={<EmptyState hasQuery={isActive} />}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#111827',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#1d4ed8',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#3b82f6',
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
