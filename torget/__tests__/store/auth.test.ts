/**
 * Unit tests for store/auth.ts
 *
 * We mock lib/supabase to avoid real network calls.
 */

import type { Session, User, AuthError } from '@supabase/supabase-js';

// ---- Helpers ----------------------------------------------------------------

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { display_name: 'Test User' },
    ...overrides,
  }) as User;

const makeSession = (user: User = makeUser()): Session =>
  ({
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  }) as Session;

const makeAuthError = (message: string, status: number): AuthError =>
  Object.assign(new Error(message), { status, name: 'AuthError' }) as AuthError;

// ---- Mock setup -------------------------------------------------------------

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

// Import AFTER mock is set up
import { useAuthStore } from '../../store/auth';

// ---- Reset between tests ----------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the store state between tests
  useAuthStore.setState({
    session: null,
    user: null,
    loading: false,
    error: null,
  });
  // Default: onAuthStateChange does nothing
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
});

// ---- Tests ------------------------------------------------------------------

describe('useAuthStore — signIn', () => {
  it('sets session and user on successful sign-in', async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockSignInWithPassword.mockResolvedValue({ data: { session, user }, error: null });

    await useAuthStore.getState().signIn('test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.session).toBe(session);
    expect(state.user).toBe(user);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error message on failed sign-in', async () => {
    const authError = makeAuthError('Invalid login credentials', 400);
    mockSignInWithPassword.mockResolvedValue({ data: { session: null, user: null }, error: authError });

    await useAuthStore.getState().signIn('test@example.com', 'wrong-password');

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Ugyldig e-post eller passord.');
  });

  it('sets loading to true while signing in, then false after', async () => {
    const loadingStates: boolean[] = [];
    let resolveSignIn!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });

    mockSignInWithPassword.mockReturnValue(pendingPromise);

    const signInPromise = useAuthStore.getState().signIn('test@example.com', 'password123');
    // After calling signIn, loading should be true
    expect(useAuthStore.getState().loading).toBe(true);

    // Resolve the promise
    resolveSignIn({ data: { session: null, user: null }, error: makeAuthError('fail', 400) });
    await signInPromise;

    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('sets generic error for non-400/422 auth errors', async () => {
    const authError = makeAuthError('Too many requests', 429);
    mockSignInWithPassword.mockResolvedValue({ data: { session: null, user: null }, error: authError });

    await useAuthStore.getState().signIn('test@example.com', 'password');

    expect(useAuthStore.getState().error).toBe('Noe gikk galt. Prøv igjen.');
  });
});

describe('useAuthStore — signUp', () => {
  it('sets session and user on successful registration', async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockSignUp.mockResolvedValue({ data: { session, user }, error: null });

    await useAuthStore.getState().signUp('new@example.com', 'password123', 'New User');

    const state = useAuthStore.getState();
    expect(state.session).toBe(session);
    expect(state.user).toBe(user);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('passes display_name in metadata when signing up', async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockSignUp.mockResolvedValue({ data: { session, user }, error: null });

    await useAuthStore.getState().signUp('new@example.com', 'password123', 'Ola Nordmann');

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: { data: { display_name: 'Ola Nordmann' } },
    });
  });

  it('sets 422 error message for duplicate email', async () => {
    const authError = makeAuthError('User already registered', 422);
    mockSignUp.mockResolvedValue({ data: { session: null, user: null }, error: authError });

    await useAuthStore.getState().signUp('existing@example.com', 'password123', 'Test');

    expect(useAuthStore.getState().error).toBe('E-posten er allerede registrert.');
  });
});

describe('useAuthStore — signOut', () => {
  it('clears session and user on sign-out', async () => {
    // Start with a session
    const user = makeUser();
    useAuthStore.setState({ session: makeSession(user), user });

    mockSignOut.mockResolvedValue({ error: null });

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('clears session and sets error message if supabase signOut returns an error', async () => {
    const user = makeUser();
    useAuthStore.setState({ session: makeSession(user), user });

    mockSignOut.mockResolvedValue({ error: makeAuthError('Network error', 500) });

    await useAuthStore.getState().signOut();

    // signOut always clears the local state regardless of server response
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    // Error message is shown to the user (generic Norwegian message for unknown errors)
    expect(state.error).toBe('Noe gikk galt. Prøv igjen.');
  });
});

describe('useAuthStore — initialize', () => {
  it('restores existing session from storage', async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session).toBe(session);
    expect(state.user).toBe(user);
    expect(state.loading).toBe(false);
  });

  it('sets session to null when no stored session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('registers onAuthStateChange listener', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await useAuthStore.getState().initialize();

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });
});

describe('useAuthStore — clearError', () => {
  it('clears the error field', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
