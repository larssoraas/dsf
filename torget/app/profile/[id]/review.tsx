import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useCreateReview } from '@/hooks/useReviews';
import { useAuthStore } from '@/store/auth';

function StarSelector({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (r: number) => void;
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          accessibilityRole="button"
          accessibilityLabel={`${star} stjerne${star !== 1 ? 'r' : ''}`}
        >
          <Text style={[styles.star, star <= rating ? styles.starFilled : styles.starEmpty]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProfileReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const currentUserId = session?.user?.id;
  const isSelfReview = currentUserId === id;

  if (isSelfReview) {
    return (
      <>
        <Stack.Screen options={{ title: 'Anmeld selger', headerBackTitle: 'Tilbake' }} />
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Ikke tillatt</Text>
          <Text style={styles.errorText}>Du kan ikke anmelde deg selv.</Text>
        </View>
      </>
    );
  }

  const handleSubmit = () => {
    if (isSelfReview) {
      Alert.alert('Ikke tillatt', 'Du kan ikke anmelde deg selv.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Velg antall stjerner', 'Du må gi minst 1 stjerne.');
      return;
    }

    // listingId is required by schema — use a sentinel value for profile-level review
    // Ideally the user would pick a specific listing, but we use reviewedId as listingId fallback
    createReview.mutate(
      {
        reviewedId: id,
        listingId: id,
        rating,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err) => {
          const message =
            err.message === 'Du kan ikke anmelde deg selv.'
              ? err.message
              : 'Noe gikk galt. Prøv igjen.';
          Alert.alert('Feil', message);
        },
      },
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Anmeld selger', headerBackTitle: 'Tilbake' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Din vurdering</Text>
            <StarSelector rating={rating} onChange={setRating} />
            {rating === 0 && (
              <Text style={styles.ratingHint}>Trykk på en stjerne for å gi vurdering</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kommentar (valgfritt)</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Fortell andre om din erfaring med selgeren..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!createReview.isPending}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, createReview.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createReview.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send anmeldelse"
          >
            {createReview.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Send anmeldelse</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
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
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 40,
  },
  starFilled: {
    color: '#f59e0b',
  },
  starEmpty: {
    color: '#d1d5db',
  },
  ratingHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
