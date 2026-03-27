import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { usePostDraftStore } from '../../store/post';
import { AuthModal } from '../../components/auth/AuthModal';

export default function PostScreen() {
  const router = useRouter();
  const reset = usePostDraftStore((s) => s.reset);
  const { session } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (session) {
      reset();
      router.replace('/post/images');
    }
  }, [session, reset, router]);

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Legg ut annonse</Text>
        <Text style={styles.body}>
          Du må logge inn eller opprette konto for å legge ut annonser.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowAuth(true)}
          accessibilityRole="button"
          accessibilityLabel="Logg inn eller registrer deg"
          testID="post-auth-button"
        >
          <Text style={styles.buttonText}>Logg inn / Registrer</Text>
        </TouchableOpacity>
        <AuthModal
          visible={showAuth}
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
          message="Du må logge inn for å legge ut annonse"
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9fafb',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
