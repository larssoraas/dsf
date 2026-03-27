import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ImagePickerComponent } from '../../components/listing/ImagePicker';
import { usePostDraftStore } from '../../store/post';

export default function PostImagesScreen() {
  const router = useRouter();
  const { images, setImages } = usePostDraftStore();

  function handleNext() {
    router.push('/post/details');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Legg til bilder av det du vil annonsere. Gode bilder gir raskere salg!
      </Text>

      <ImagePickerComponent images={images} onChange={setImages} />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, images.length === 0 && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={images.length === 0}
        >
          <Text style={styles.nextButtonText}>Neste</Text>
        </TouchableOpacity>

        {images.length === 0 && (
          <TouchableOpacity onPress={handleNext} style={styles.skipButton}>
            <Text style={styles.skipText}>Hopp over bilder</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  footer: {
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
