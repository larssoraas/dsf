import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useMapListings, parseLocationString } from '@/hooks/useMapListings';
import type { ListingWithDetails } from '@/lib/types';

// react-native-maps is not available on web — loaded conditionally to avoid web crashes
type AnyProps = Record<string, unknown>;
type MapViewType = React.ComponentType<AnyProps>;
type MarkerType = React.ComponentType<AnyProps>;

let NativeMapView: MapViewType | null = null;
let NativeMarker: MarkerType | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Maps = require('react-native-maps') as { default: MapViewType; Marker: MarkerType };
  NativeMapView = Maps.default;
  NativeMarker = Maps.Marker;
}

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
type RadiusOption = (typeof RADIUS_OPTIONS)[number];

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEFAULT_REGION: MapRegion = {
  latitude: 59.9139,
  longitude: 10.7522,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

function renderMapView(
  MV: MapViewType,
  MK: MarkerType,
  listingsWithLocation: ListingWithDetails[],
  region: MapRegion,
  onRegionChangeComplete: (r: MapRegion) => void,
): React.ReactElement {
  return (
    <MV
      style={styles.map}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      showsUserLocation
    >
      {listingsWithLocation.map((listing) => {
        const coords = parseLocationString(listing.location!);
        if (!coords) return null;
        return (
          <MK
            key={listing.id}
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            title={listing.title}
            description={listing.price !== null ? `${listing.price} kr` : 'Gratis'}
            onPress={() => router.push(`/listing/${listing.id}`)}
          />
        );
      })}
    </MV>
  );
}

export default function MapScreen() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackText}>Kart er ikke tilgjengelig på web</Text>
      </View>
    );
  }

  return <MapScreenNative />;
}

function MapScreenNative() {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);

  const { listings, isLoading, isError, radius, setRadius } = useMapListings({
    lat: userLat,
    lng: userLng,
  });

  const handleFindMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationDenied(true);
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setUserLat(latitude);
      setUserLng(longitude);
      setLocationDenied(false);
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch {
      // Could not get GPS — leave current region unchanged
    }
  };

  const listingsWithLocation = listings.filter((l) => l.location !== null);

  return (
    <View style={styles.container}>
      {/* Radius filter */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={RADIUS_OPTIONS as unknown as RadiusOption[]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.filterBarContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.radiusTab, radius === item && styles.radiusTabActive]}
              onPress={() => setRadius(item)}
              accessibilityRole="button"
            >
              <Text style={[styles.radiusTabText, radius === item && styles.radiusTabTextActive]}>
                {item} km
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Finn min posisjon */}
      <View style={styles.locationButtonRow}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleFindMyLocation}
          accessibilityRole="button"
          accessibilityLabel="Finn min posisjon"
        >
          <Text style={styles.locationButtonText}>Finn min posisjon</Text>
        </TouchableOpacity>
        {locationDenied && (
          <Text style={styles.locationDeniedText}>Stedstilgang avslått</Text>
        )}
      </View>

      {/* Map */}
      {NativeMapView !== null && NativeMarker !== null
        ? renderMapView(NativeMapView, NativeMarker, listingsWithLocation, region, setRegion)
        : null}

      {/* Loading / error overlay */}
      {isLoading && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Kunne ikke laste annonser. Prøv igjen.</Text>
        </View>
      )}

      {!isLoading && !isError && userLat === null && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintBannerText}>
            Trykk "Finn min posisjon" for å se annonser i nærheten
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  webFallbackText: {
    fontSize: 16,
    color: '#6b7280',
  },
  filterBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  radiusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  radiusTabActive: {
    backgroundColor: '#3b82f6',
  },
  radiusTabText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  radiusTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  locationButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  locationButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  locationButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  locationDeniedText: {
    fontSize: 12,
    color: '#92400e',
  },
  map: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991b1b',
    textAlign: 'center',
  },
  hintBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hintBannerText: {
    fontSize: 13,
    color: '#1d4ed8',
    textAlign: 'center',
  },
});
