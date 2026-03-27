import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/store/auth';

interface Props {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const handleSignUp = async () => {
    setLocalError(null);
    clearError();

    if (!displayName.trim()) {
      setLocalError('Navn er påkrevd.');
      return;
    }
    if (!email.trim()) {
      setLocalError('E-post er påkrevd.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Passordet må være minst 8 tegn.');
      return;
    }

    await signUp(email.trim(), password, displayName.trim());
    const { session } = useAuthStore.getState();
    if (session) {
      onSuccess?.();
    }
  };

  const displayedError = localError ?? error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {displayedError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{displayedError}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Navn"
        value={displayName}
        onChangeText={(text) => {
          setLocalError(null);
          clearError();
          setDisplayName(text);
        }}
        autoCapitalize="words"
        autoComplete="name"
        testID="register-display-name-input"
      />

      <TextInput
        style={styles.input}
        placeholder="E-post"
        value={email}
        onChangeText={(text) => {
          setLocalError(null);
          clearError();
          setEmail(text);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        testID="register-email-input"
      />

      <TextInput
        style={styles.input}
        placeholder="Passord (minst 8 tegn)"
        value={password}
        onChangeText={(text) => {
          setLocalError(null);
          clearError();
          setPassword(text);
        }}
        secureTextEntry
        autoComplete="new-password"
        testID="register-password-input"
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Registrer deg"
        testID="register-submit-button"
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Registrer deg</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
