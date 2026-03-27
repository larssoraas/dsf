import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useOwnProfile, useUpdateProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_WIDTH = 400;
const AVATAR_COMPRESS = 0.8;

async function uploadAvatar(uri: string, userId: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: AVATAR_MAX_WIDTH } }],
    { compress: AVATAR_COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

  if (error) {
    console.error('[edit profile] avatar upload:', error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { data, isLoading } = useOwnProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Populate fields once profile data loads
  useEffect(() => {
    if (data) {
      setDisplayName(data.profile.display_name ?? '');
      setCity(data.profile.city ?? '');
    }
  }, [data]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilgang nektet', 'Vi trenger tilgang til bilder for å laste opp avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      if (asset.type !== 'image') {
        Alert.alert('Feil', 'Kun bildefiler er tillatt.');
        return;
      }
      setAvatarUri(asset.uri);
    }
  };

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert('Feil', 'Navn kan ikke være tomt.');
      return;
    }

    const userId = session?.user?.id;
    if (!userId) return;

    let avatarUrl: string | undefined;

    if (avatarUri) {
      setUploadingAvatar(true);
      try {
        avatarUrl = await uploadAvatar(avatarUri, userId);
      } catch {
        Alert.alert('Feil', 'Noe gikk galt. Prøv igjen.');
        setUploadingAvatar(false);
        return;
      }
      setUploadingAvatar(false);
    }

    updateProfile.mutate(
      {
        display_name: trimmedName,
        city: city.trim() || undefined,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          Alert.alert('Feil', 'Noe gikk galt. Prøv igjen.');
        },
      },
    );
  };

  const isBusy = uploadingAvatar || updateProfile.isPending;

  const currentAvatarUrl = avatarUri ?? data?.profile?.avatar_url ?? null;
  const initials = (displayName || (data?.profile?.display_name ?? '?'))
    .charAt(0)
    .toUpperCase();

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Rediger profil', headerBackTitle: 'Tilbake' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Rediger profil', headerBackTitle: 'Tilbake' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePickAvatar}
              accessibilityRole="button"
              accessibilityLabel="Endre profilbilde"
            >
              {currentAvatarUrl ? (
                <Image source={{ uri: currentAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Text style={styles.avatarOverlayText}>Endre</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.field}>
            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Ditt navn"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              returnKeyType="next"
              editable={!isBusy}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>By</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Oslo"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              returnKeyType="done"
              editable={!isBusy}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isBusy && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel="Lagre"
          >
            {isBusy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Lagre</Text>
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
    backgroundColor: '#f9fafb',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '700',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    alignItems: 'center',
    paddingVertical: 4,
  },
  avatarOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
