import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Profile } from '@/lib/types';

interface Props {
  profile: Profile;
  isOwnProfile: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={[styles.star, star <= Math.round(rating) ? styles.starFilled : styles.starEmpty]}
        >
          ★
        </Text>
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

export function ProfileHeader({ profile, isOwnProfile }: Props) {
  const router = useRouter();
  const initials = profile.displayName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
      </View>

      <Text style={styles.displayName}>{profile.displayName}</Text>

      {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}

      <View style={styles.ratingContainer}>
        <StarRating rating={Number(profile.avgRating ?? 0)} />
        <Text style={styles.reviewCount}>
          {profile.reviewCount === 1
            ? '1 anmeldelse'
            : `${profile.reviewCount} anmeldelser`}
        </Text>
      </View>

      {isOwnProfile && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/profile/edit')}
          accessibilityRole="button"
          accessibilityLabel="Rediger profil"
        >
          <Text style={styles.editButtonText}>Rediger profil</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  city: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  star: {
    fontSize: 20,
  },
  starFilled: {
    color: '#f59e0b',
  },
  starEmpty: {
    color: '#d1d5db',
  },
  ratingText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginLeft: 6,
  },
  reviewCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});
