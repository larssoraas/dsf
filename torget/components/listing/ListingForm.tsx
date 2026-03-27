import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { ListingCategory, ListingCondition, ListingType } from '../../lib/types';

export interface ListingFormData {
  title: string;
  description: string;
  price: string;
  category: ListingCategory;
  condition: ListingCondition;
  listingType: ListingType;
}

interface ListingFormProps {
  data: ListingFormData;
  errors: Partial<Record<keyof ListingFormData, string>>;
  onChange: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
}

const CATEGORIES: { value: ListingCategory; label: string }[] = [
  { value: 'electronics', label: 'Elektronikk' },
  { value: 'clothing', label: 'Klær' },
  { value: 'furniture', label: 'Møbler' },
  { value: 'sports', label: 'Sport' },
  { value: 'books', label: 'Bøker' },
  { value: 'other', label: 'Annet' },
];

const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: 'new', label: 'Ny' },
  { value: 'like_new', label: 'Som ny' },
  { value: 'good', label: 'God stand' },
  { value: 'used', label: 'Brukt' },
  { value: 'for_parts', label: 'Til deler' },
];

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: 'sale', label: 'Selges' },
  { value: 'wanted', label: 'Ønskes' },
  { value: 'free', label: 'Gratis' },
];

export function ListingForm({ data, errors, onChange }: ListingFormProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Type annonse</Text>
        <View style={styles.radioGroup}>
          {LISTING_TYPES.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.radioOption, data.listingType === value && styles.radioSelected]}
              onPress={() => onChange('listingType', value)}
            >
              <Text
                style={[
                  styles.radioText,
                  data.listingType === value && styles.radioTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tittel */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Tittel <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.title ? styles.inputError : null]}
          value={data.title}
          onChangeText={(v) => onChange('title', v)}
          placeholder="Hva selger du?"
          placeholderTextColor="#9ca3af"
          maxLength={100}
          returnKeyType="next"
        />
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
      </View>

      {/* Beskrivelse */}
      <View style={styles.field}>
        <Text style={styles.label}>Beskrivelse</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={data.description}
          onChangeText={(v) => onChange('description', v)}
          placeholder="Beskriv tilstanden, inkluder tilbehør osv."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={2000}
        />
      </View>

      {/* Pris */}
      {data.listingType === 'sale' && (
        <View style={styles.field}>
          <Text style={styles.label}>
            Pris (kr) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.price ? styles.inputError : null]}
            value={data.price}
            onChangeText={(v) => onChange('price', v.replace(/[^0-9]/g, ''))}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            returnKeyType="done"
          />
          {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
        </View>
      )}

      {/* Kategori */}
      <View style={styles.field}>
        <Text style={styles.label}>Kategori</Text>
        <View style={styles.chipGroup}>
          {CATEGORIES.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, data.category === value && styles.chipSelected]}
              onPress={() => onChange('category', value)}
            >
              <Text
                style={[styles.chipText, data.category === value && styles.chipTextSelected]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tilstand */}
      <View style={styles.field}>
        <Text style={styles.label}>Tilstand</Text>
        <View style={styles.chipGroup}>
          {CONDITIONS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, data.condition === value && styles.chipSelected]}
              onPress={() => onChange('condition', value)}
            >
              <Text
                style={[styles.chipText, data.condition === value && styles.chipTextSelected]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 20,
    paddingBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  radioTextSelected: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  chipTextSelected: {
    color: '#3b82f6',
    fontWeight: '700',
  },
});
