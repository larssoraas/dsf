import { create } from 'zustand';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<() => void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

const mapAuthError = (error: AuthError): string => {
  switch (error.status) {
    case 400:
      return 'Ugyldig e-post eller passord.';
    case 422:
      return 'E-posten er allerede registrert.';
    default:
      return 'Noe gikk galt. Prøv igjen.';
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  loading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: mapAuthError(error) });
      return;
    }
    set({ session: data.session, user: data.user, loading: false, error: null });
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) {
      set({ loading: false, error: mapAuthError(error) });
      return;
    }
    set({ session: data.session, user: data.user, loading: false, error: null });
  },

  signOut: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ session: null, user: null, loading: false, error: mapAuthError(error) });
      return;
    }
    set({ session: null, user: null, loading: false, error: null });
  },

  initialize: async () => {
    set({ loading: true });
    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
    return () => subscription.unsubscribe();
  },

  clearError: () => set({ error: null }),
}));
