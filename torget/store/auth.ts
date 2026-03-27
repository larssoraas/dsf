import { create } from 'zustand';
import { api, setTokens, clearTokens, getAccessToken } from '../lib/api';
import type { AuthTokens } from '../lib/types';

interface SessionUser {
  id: string;
  email: string;
}

interface AuthState {
  session: { user: SessionUser } | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// Decode JWT payload (base64) to get user.id and email.
// Client-side only — no signature verification.
function decodeJwtPayload(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload?.sub !== 'string' || typeof payload?.email !== 'string') {
      return null;
    }
    return { sub: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}

function mapAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (message.includes('allerede registrert') || message.includes('already registered')) {
    return 'E-posten er allerede registrert.';
  }
  if (
    message.includes('Ugyldig') ||
    message.includes('Invalid') ||
    message.includes('feil passord')
  ) {
    return 'Ugyldig e-post eller passord.';
  }
  return 'Noe gikk galt. Prøv igjen.';
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isLoading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await api.post<AuthTokens>('/auth/login', { email, password });
      await setTokens(tokens.accessToken, tokens.refreshToken);
      const payload = decodeJwtPayload(tokens.accessToken);
      if (!payload) {
        set({ isLoading: false, error: 'Noe gikk galt. Prøv igjen.' });
        return;
      }
      set({
        session: { user: { id: payload.sub, email: payload.email } },
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[auth] signIn error:', err);
      set({ isLoading: false, error: mapAuthError(err) });
    }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await api.post<AuthTokens>('/auth/register', {
        email,
        password,
        displayName,
      });
      await setTokens(tokens.accessToken, tokens.refreshToken);
      const payload = decodeJwtPayload(tokens.accessToken);
      if (!payload) {
        set({ isLoading: false, error: 'Noe gikk galt. Prøv igjen.' });
        return;
      }
      set({
        session: { user: { id: payload.sub, email: payload.email } },
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[auth] signUp error:', err);
      set({ isLoading: false, error: mapAuthError(err) });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      // Best-effort server logout — clear local tokens regardless of outcome
      await api.post('/auth/logout', {});
    } catch (err) {
      console.error('[auth] signOut error:', err);
    } finally {
      await clearTokens();
      set({ session: null, isLoading: false, error: null });
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await readAccessToken();
      if (!accessToken) {
        set({ session: null, isLoading: false });
        return;
      }
      const payload = decodeJwtPayload(accessToken);
      if (!payload) {
        set({ session: null, isLoading: false });
        return;
      }
      set({
        session: { user: { id: payload.sub, email: payload.email } },
        isLoading: false,
      });
    } catch {
      set({ session: null, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
