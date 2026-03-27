import * as ImageManipulator from 'expo-image-manipulator';
import { getAccessToken } from './api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_COMPRESS = 0.7;

export async function uploadListingImage(
  uri: string,
  maxWidth = DEFAULT_MAX_WIDTH,
  compress = DEFAULT_COMPRESS,
): Promise<string> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG },
    );

    // Read compressed file as ArrayBuffer — Hermes does not support FileReader
    const fileResponse = await fetch(manipulated.uri);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('image', blob, 'image.jpg');

    const accessToken = await getAccessToken();
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${BASE_URL}/uploads/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      console.error('[storage] upload failed:', response.status);
      throw new Error('Noe gikk galt. Prøv igjen.');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('Noe gikk galt. Prøv igjen.');
    }

    const url = (body as { data?: { url?: string } })?.data?.url;
    if (typeof url !== 'string') {
      console.error('[storage] unexpected response shape:', body);
      throw new Error('Noe gikk galt. Prøv igjen.');
    }

    return url;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Noe gikk galt')) {
      throw err;
    }
    console.error('[storage] uploadListingImage error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}
