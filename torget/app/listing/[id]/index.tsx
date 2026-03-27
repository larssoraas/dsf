import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchListingById } from '@/lib/queries/listings';
import { startConversation } from '@/lib/queries/conversations';
import { ListingDetail } from '@/components/listing/ListingDetail';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuthStore } from '@/store/auth';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => fetchListingById(id),
    enabled: Boolean(id),
  });

  const handleReviewPress = () => {
    if (!session) {
      setShowAuthModal(true);
    } else {
      router.push(`/listing/${id}/review`);
    }
  };

  const handleContactSeller = async () => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }
    setIsStartingConversation(true);
    try {
      const conversation = await startConversation(id);
      router.push(`/conversation/${conversation.id}`);
    } catch (err) {
      console.error('[listing] startConversation error:', err);
    } finally {
      setIsStartingConversation(false);
    }
  };

  const isOwnListing = Boolean(session && listing && session.user.id === listing.sellerId);

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

      {listing && (
        <>
          <ListingDetail listing={listing} />
          <View style={styles.reviewButtonContainer}>
            {!isOwnListing && session && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactSeller}
                disabled={isStartingConversation}
                accessibilityRole="button"
                accessibilityLabel="Kontakt selger"
                testID="contact-seller-button"
              >
                <Text style={styles.contactButtonText}>
                  {isStartingConversation ? 'Laster…' : 'Kontakt selger'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={handleReviewPress}
              accessibilityRole="button"
              accessibilityLabel="Skriv anmeldelse"
              testID="review-button"
            >
              <Text style={styles.reviewButtonText}>Skriv anmeldelse</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
        message="Logg inn for å skrive en anmeldelse"
      />
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
  reviewButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  contactButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});
