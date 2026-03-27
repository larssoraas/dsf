import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { useOwnProfile } from '../../hooks/useProfile';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { MyListings } from '../../components/listing/MyListings';

export default function ProfileScreen() {
  const { signOut, isLoading: authLoading } = useAuthStore();
  const { data, isLoading, isError, refetch } = useOwnProfile();

  const handleSignOut = () => {
    Alert.alert('Logg ut', 'Er du sikker på at du vil logge ut?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logg ut', style: 'destructive', onPress: signOut },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Kunne ikke laste profilen</Text>
        <Text style={styles.errorText}>Prøv igjen litt senere.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Prøv igjen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProfileHeader profile={data.profile} isOwnProfile />

      <MyListings
        activeListings={data.activeListings}
        closedListings={data.closedListings}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.signOutButton, authLoading && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={authLoading}
          testID="sign-out-button"
          accessibilityRole="button"
          accessibilityLabel="Logg ut"
        >
          <Text style={styles.signOutButtonText}>Logg ut</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
