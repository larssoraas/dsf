import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchListingById } from '@/lib/queries/listings';
import { ListingDetail } from '@/components/listing/ListingDetail';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListingById(id),
    enabled: Boolean(id),
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: listing?.title ?? 'Annonse',
          headerBackTitle: 'Tilbake',
        }}
      />

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Kunne ikke laste annonsen</Text>
          <Text style={styles.errorText}>Prøv igjen litt senere.</Text>
        </View>
      )}

      {!isLoading && !isError && listing === null && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Annonsen finnes ikke</Text>
          <Text style={styles.errorText}>Den kan ha blitt slettet eller utløpt.</Text>
        </View>
      )}

      {listing && <ListingDetail listing={listing} />}
    </>
  );
}

const styles = StyleSheet.create({
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
});
