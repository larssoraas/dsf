import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import type { ReviewWithReviewer } from '@/hooks/useReviews';

interface Props {
  reviews: ReviewWithReviewer[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={[styles.star, star <= rating ? styles.starFilled : styles.starEmpty]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: ReviewWithReviewer }) {
  const initials = review.reviewer?.display_name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.reviewerAvatar}>
          {review.reviewer?.avatar_url ? (
            <Image source={{ uri: review.reviewer.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewer?.display_name}</Text>
          <StarRow rating={review.rating} />
        </View>
        <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
      </View>
      {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Ingen anmeldelser ennå</Text>
    </View>
  );
}

export function ReviewList({ reviews }: Props) {
  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ReviewCard review={item} />}
      ListEmptyComponent={<EmptyState />}
      contentContainerStyle={reviews.length === 0 ? styles.emptyListContent : undefined}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  reviewerAvatar: {},
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 14,
  },
  starFilled: {
    color: '#f59e0b',
  },
  starEmpty: {
    color: '#d1d5db',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  comment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  emptyListContent: {
    flexGrow: 1,
  },
});
