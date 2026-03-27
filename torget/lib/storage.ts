import { Alert } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const BUCKET = 'listing-images';
const MAX_WIDTH = 1200;
const COMPRESS = 0.7;

export async function uploadListingImage(uri: string, path: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    console.error('storage upload error:', error);
    Alert.alert('Feil', 'Kunne ikke laste opp bildet. Prøv igjen.');
    throw new Error('Kunne ikke laste opp bildet. Prøv igjen.');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
