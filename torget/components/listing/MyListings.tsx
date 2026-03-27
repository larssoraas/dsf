import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMarkAsSold } from '@/hooks/useProfile';
import type { Listing } from '@/lib/types';

interface Props {
  activeListings: Listing[];
  closedListings: Listing[];
}

function formatPrice(price: number | null, type: Listing['listing_type']): string {
  if (type === 'free') return 'Gratis';
  if (price === null) return 'Pris ikke oppgitt';
  return `${price.toLocaleString('nb-NO')} kr`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
  });
}

function ListingRow({ listing }: { listing: Listing }) {
  const router = useRouter();
  const markAsSold = useMarkAsSold(listing.id);
  const isClosed = listing.status !== 'active';

  const handleMarkSold = () => {
    Alert.alert(
      'Marker som solgt',
      `Er du sikker på at du vil markere "${listing.title}" som solgt?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Marker solgt',
          style: 'default',
          onPress: () => {
            markAsSold.mutate(undefined, {
              onError: () => {
                Alert.alert('Feil', 'Noe gikk galt. Prøv igjen.');
              },
            });
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.row, isClosed && styles.rowClosed]}
      onPress={() => router.push(`/listing/${listing.id}`)}
      onLongPress={!isClosed ? handleMarkSold : undefined}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={listing.title}
      accessibilityHint={!isClosed ? 'Hold inne for å markere som solgt' : undefined}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.title, isClosed && styles.titleClosed]} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={[styles.meta, isClosed && styles.metaClosed]}>
          {formatPrice(listing.price, listing.listing_type)} · {formatDate(listing.created_at)}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {isClosed ? (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>
              {listing.status === 'sold' ? 'Solgt' : 'Utgått'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.soldButton}
            onPress={handleMarkSold}
            disabled={markAsSold.isPending}
            accessibilityRole="button"
            accessibilityLabel="Marker som solgt"
          >
            <Text style={styles.soldButtonText}>
              {markAsSold.isPending ? '...' : 'Marker solgt'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Du har ingen annonser ennå</Text>
    </View>
  );
}

interface ListItem {
  type: 'header' | 'listing';
  id: string;
  title?: string;
  listing?: Listing;
}

export function MyListings({ activeListings, closedListings }: Props) {
  const hasAny = activeListings.length > 0 || closedListings.length > 0;

  if (!hasAny) {
    return <EmptyState />;
  }

  const items: ListItem[] = [];

  if (activeListings.length > 0) {
    items.push({ type: 'header', id: 'header-active', title: 'Aktive annonser' });
    activeListings.forEach((l) => items.push({ type: 'listing', id: l.id, listing: l }));
  }

  if (closedListings.length > 0) {
    items.push({ type: 'header', id: 'header-closed', title: 'Avsluttede annonser' });
    closedListings.forEach((l) => items.push({ type: 'listing', id: l.id, listing: l }));
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return <SectionHeader title={item.title ?? ''} />;
        }
        if (item.listing) {
          return <ListingRow listing={item.listing} />;
        }
        return null;
      }}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 10,
  },
  rowClosed: {
    opacity: 0.6,
  },
  rowContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  titleClosed: {
    color: '#6b7280',
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaClosed: {
    color: '#9ca3af',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  soldButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  soldButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  soldBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soldBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
