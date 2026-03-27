import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const KEY_ACCESS = 'torget_access_token';
export const KEY_REFRESH = 'torget_refresh_token';

// ─── Secure storage (same pattern as lib/supabase.ts) ───────────────────────

const storage = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(sessionStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Token management ────────────────────────────────────────────────────────

export async function setTokens(access: string, refresh: string): Promise<void> {
  await storage.setItem(KEY_ACCESS, access);
  await storage.setItem(KEY_REFRESH, refresh);
}

export async function clearTokens(): Promise<void> {
  await storage.removeItem(KEY_ACCESS);
  await storage.removeItem(KEY_REFRESH);
}

export async function getAccessToken(): Promise<string | null> {
  return storage.getItem(KEY_ACCESS);
}

async function getRefreshToken(): Promise<string | null> {
  return storage.getItem(KEY_REFRESH);
}

// ─── Token-refresh mutex ──────────────────────────────────────────────────────
// If multiple requests get a 401 simultaneously only one refresh call is made.
// All concurrent callers share the same Promise and receive the result together.

const isValidTokens = (v: unknown): v is { data: { accessToken: string; refreshToken: string } } =>
  typeof (v as any)?.data?.accessToken === 'string' &&
  typeof (v as any)?.data?.refreshToken === 'string';

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      await clearTokens();
      return null;
    }

    if (!isValidTokens(body)) {
      console.warn('[api] Unexpected refresh response shape');
      await clearTokens();
      return null;
    }

    const newAccess = body.data.accessToken;
    const newRefresh = body.data.refreshToken;

    await setTokens(newAccess, newRefresh);
    return newAccess;
  } catch (err) {
    console.error('[api] token refresh failed:', err);
    await clearTokens();
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// ─── ApiError ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { params, body } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs.length > 0) {
      url = `${url}?${qs}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    console.error(`[api] network error ${method} ${path}:`, err);
    throw new Error('Noe gikk galt. Sjekk internettforbindelsen og prøv igjen.');
  }

  // Attempt token refresh on 401 — only once
  if (response.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(method, path, options, true);
    }
    throw new Error('Sesjonen er utløpt. Logg inn på nytt.');
  }

  if (!response.ok) {
    let serverMessage: string | undefined;
    try {
      const errBody = (await response.json()) as { error?: string };
      serverMessage = errBody?.error;
    } catch {
      // ignore parse errors
    }
    console.error(`[api] ${method} ${path} → ${response.status}:`, serverMessage);
    throw new ApiError('Noe gikk galt. Prøv igjen.', response.status);
  }

  // 204 No Content — return undefined cast to T
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    console.error(`[api] failed to parse response for ${method} ${path}:`, err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  const parsed = data as { data: T };
  return parsed.data;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return request<T>('GET', path, { params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, { body });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, { body });
  },

  del<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
