import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostDraftStore } from '../../store/post';
import { useCreateListing } from '../../hooks/useCreateListing';
import type { ListingCategory, ListingCondition, ListingType } from '../../lib/types';

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  electronics: 'Elektronikk',
  clothing: 'Klær',
  furniture: 'Møbler',
  sports: 'Sport',
  books: 'Bøker',
  other: 'Annet',
};

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'Ny',
  like_new: 'Som ny',
  good: 'God stand',
  used: 'Brukt',
  for_parts: 'Til deler',
};

const TYPE_LABELS: Record<ListingType, string> = {
  sale: 'Selges',
  wanted: 'Ønskes',
  free: 'Gratis',
};

export default function PostPreviewScreen() {
  const router = useRouter();
  const { images, title, description, price, category, condition, listingType, reset } =
    usePostDraftStore();
  const { mutate, isPending } = useCreateListing();

  function handlePublish() {
    mutate(
      { images, title, description, price, category, condition, listingType },
      {
        onSuccess: () => {
          reset();
          Alert.alert('Publisert!', 'Annonsen din er nå synlig i feeden.', [
            {
              text: 'Se feed',
              onPress: () => router.replace('/(tabs)/'),
            },
          ]);
        },
        onError: (error) => {
          Alert.alert(
            'Noe gikk galt',
            error instanceof Error ? error.message : 'Prøv igjen.',
          );
        },
      },
    );
  }

  const displayPrice =
    listingType === 'free'
      ? 'Gratis'
      : listingType === 'wanted'
        ? '—'
        : price
          ? `${parseInt(price, 10).toLocaleString('nb-NO')} kr`
          : 'Pris ikke oppgitt';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Bilder */}
        {images.length > 0 ? (
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            style={styles.imageList}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.image} />
            )}
          />
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Text style={styles.noImageText}>Ingen bilder</Text>
          </View>
        )}

        {/* Detaljer */}
        <View style={styles.details}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.price}>{displayPrice}</Text>
          </View>

          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{TYPE_LABELS[listingType]}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{CATEGORY_LABELS[category]}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{CONDITION_LABELS[condition]}</Text>
            </View>
          </View>

          {description.trim() !== '' && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.publishButton, isPending && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publiser annonse</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    paddingBottom: 24,
  },
  imageList: {
    height: 260,
    backgroundColor: '#e5e7eb',
  },
  image: {
    width: Dimensions.get('window').width,
    height: 260,
    resizeMode: 'cover',
  },
  noImagePlaceholder: {
    height: 160,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  details: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  publishButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
