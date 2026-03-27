import { View, TouchableOpacity, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ListingForm, type ListingFormData } from '../../components/listing/ListingForm';
import { usePostDraftStore } from '../../store/post';
import type { ListingCategory, ListingCondition, ListingType } from '../../lib/types';

type FormErrors = Partial<Record<keyof ListingFormData, string>>;

export default function PostDetailsScreen() {
  const router = useRouter();
  const {
    title,
    description,
    price,
    category,
    condition,
    listingType,
    setTitle,
    setDescription,
    setPrice,
    setCategory,
    setCondition,
    setListingType,
  } = usePostDraftStore();

  const [errors, setErrors] = useState<FormErrors>({});

  const formData: ListingFormData = {
    title,
    description,
    price,
    category,
    condition,
    listingType,
  };

  function handleChange<K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) {
    switch (field) {
      case 'title':
        setTitle(value as string);
        break;
      case 'description':
        setDescription(value as string);
        break;
      case 'price':
        setPrice(value as string);
        break;
      case 'category':
        setCategory(value as ListingCategory);
        break;
      case 'condition':
        setCondition(value as ListingCondition);
        break;
      case 'listingType':
        setListingType(value as ListingType);
        break;
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const next: FormErrors = {};

    if (!title.trim()) {
      next.title = 'Tittel er påkrevd';
    }

    if (listingType === 'sale' && !price.trim()) {
      next.price = 'Pris er påkrevd for salgsannonser';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (validate()) {
      router.push('/post/preview');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.inner}>
        <ListingForm data={formData} errors={errors} onChange={handleChange} />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Forhåndsvisning</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
