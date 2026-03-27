import { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { SearchFilters } from '@/hooks/useSearch';
import type { ListingCategory, ListingCondition, ListingType } from '@/lib/types';

interface Props {
  visible: boolean;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
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

const TYPES: { value: ListingType; label: string }[] = [
  { value: 'sale', label: 'Selges' },
  { value: 'wanted', label: 'Søkes' },
  { value: 'free', label: 'Gratis' },
];

export function FilterSheet({ visible, filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<SearchFilters>(filters);

  // Sync when sheet opens
  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  const toggle = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  };

  const handleReset = () => setLocal({});

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const activeCount = Object.values(local).filter((v) => v !== undefined).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filtre</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Lukk">
            <Text style={styles.closeText}>Lukk</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Type */}
          <Text style={styles.sectionLabel}>Type</Text>
          <View style={styles.chipRow}>
            {TYPES.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, local.type === value && styles.chipActive]}
                onPress={() => toggle('type', value)}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, local.type === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={styles.sectionLabel}>Kategori</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, local.category === value && styles.chipActive]}
                onPress={() => toggle('category', value)}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, local.category === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Condition */}
          <Text style={styles.sectionLabel}>Tilstand</Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, local.condition === value && styles.chipActive]}
                onPress={() => toggle('condition', value)}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, local.condition === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price range */}
          <Text style={styles.sectionLabel}>Prisrange (kr)</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={local.minPrice !== undefined ? String(local.minPrice) : ''}
              onChangeText={(t) => {
                const n = parseFloat(t);
                setLocal((prev) => ({ ...prev, minPrice: isFinite(n) && n >= 0 ? n : undefined }));
              }}
              accessibilityLabel="Minimumspris"
            />
            <Text style={styles.priceSeparator}>–</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Maks"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={local.maxPrice !== undefined ? String(local.maxPrice) : ''}
              onChangeText={(t) => {
                const n = parseFloat(t);
                setLocal((prev) => ({ ...prev, maxPrice: isFinite(n) && n >= 0 ? n : undefined }));
              }}
              accessibilityLabel="Maksimumspris"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>Nullstill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>
              {activeCount > 0 ? `Vis resultater (${activeCount})` : 'Vis resultater'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  closeText: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#111827',
  },
  priceSeparator: {
    color: '#9ca3af',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
  },
});
