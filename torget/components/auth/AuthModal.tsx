import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

type Tab = 'login' | 'register';

export interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  message?: string;
}

export function AuthModal({ visible, onClose, onSuccess, message }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('login');

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Torget</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Lukk"
            testID="auth-modal-close"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Optional context message */}
        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'login' && styles.tabActive]}
            onPress={() => setActiveTab('login')}
            accessibilityRole="button"
            accessibilityLabel="Logg inn"
            testID="tab-login"
          >
            <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
              Logg inn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'register' && styles.tabActive]}
            onPress={() => setActiveTab('register')}
            accessibilityRole="button"
            accessibilityLabel="Registrer deg"
            testID="tab-register"
          >
            <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
              Registrer deg
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form content */}
        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'login' ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <RegisterForm onSuccess={handleSuccess} />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#6b7280',
  },
  messageBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginHorizontal: 16,
    padding: 12,
    marginBottom: 8,
  },
  messageText: {
    color: '#1d4ed8',
    fontSize: 14,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
