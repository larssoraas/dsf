import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../store/auth';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { signUp, isLoading: loading, error, clearError } = useAuthStore();

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
    if (password.length < 6) {
      setLocalError('Passordet må være minst 6 tegn.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passordene stemmer ikke overens.');
      return;
    }

    await signUp(email.trim(), password, displayName.trim());
  };

  const displayedError = localError ?? error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Torget</Text>
        <Text style={styles.subtitle}>Opprett konto</Text>

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
          testID="display-name-input"
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
          testID="email-input"
        />

        <TextInput
          style={styles.input}
          placeholder="Passord"
          value={password}
          onChangeText={(text) => {
            setLocalError(null);
            clearError();
            setPassword(text);
          }}
          secureTextEntry
          autoComplete="new-password"
          testID="password-input"
        />

        <TextInput
          style={styles.input}
          placeholder="Bekreft passord"
          value={confirmPassword}
          onChangeText={(text) => {
            setLocalError(null);
            clearError();
            setConfirmPassword(text);
          }}
          secureTextEntry
          autoComplete="new-password"
          testID="confirm-password-input"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          testID="register-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrer deg</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Har du allerede konto? </Text>
          <Link href="/(auth)/login" style={styles.loginLink}>
            Logg inn
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
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
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});
