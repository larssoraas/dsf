import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const MAX_IMAGES = 5;

interface ImagePickerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ImagePickerComponent({ images, onChange }: ImagePickerProps) {
  async function handleCamera() {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maks bilder', `Du kan legge til maks ${MAX_IMAGES} bilder.`);
      return;
    }

    const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse nektet', 'Kameratilgang er nødvendig for å ta bilder.');
      return;
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      onChange([...images, result.assets[0].uri]);
    }
  }

  async function handleGallery() {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maks bilder', `Du kan legge til maks ${MAX_IMAGES} bilder.`);
      return;
    }

    const { status } = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse nektet', 'Galleritilgang er nødvendig for å velge bilder.');
      return;
    }

    const remaining = MAX_IMAGES - images.length;

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      onChange([...images, ...uris].slice(0, MAX_IMAGES));
    }
  }

  function handleRemove(uri: string) {
    onChange(images.filter((img) => img !== uri));
  }

  return (
    <View style={styles.container}>
      {images.length > 0 && (
        <FlatList
          data={images}
          horizontal
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailList}
          renderItem={({ item }) => (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: item }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(item)}
                accessibilityLabel="Fjern bilde"
              >
                <Ionicons name="close-circle" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {images.length < MAX_IMAGES && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCamera}>
            <Ionicons name="camera-outline" size={22} color="#3b82f6" />
            <Text style={styles.actionText}>Ta bilde</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleGallery}>
            <Ionicons name="images-outline" size={22} color="#3b82f6" />
            <Text style={styles.actionText}>Velg fra galleri</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.counter}>
        {images.length}/{MAX_IMAGES} bilder
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  thumbnailList: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    backgroundColor: '#eff6ff',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  counter: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
});
