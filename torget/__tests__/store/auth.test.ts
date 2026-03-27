/**
 * Unit tests for store/auth.ts
 *
 * We mock lib/api and expo-secure-store to avoid real network/storage calls.
 */

// ---- Mock setup -------------------------------------------------------------

const mockApiPost = jest.fn();
const mockSetTokens = jest.fn();
const mockClearTokens = jest.fn();
const mockGetAccessToken = jest.fn();

jest.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
  clearTokens: (...args: unknown[]) => mockClearTokens(...args),
  getAccessToken: () => mockGetAccessToken(),
  KEY_ACCESS: 'torget_access_token',
  KEY_REFRESH: 'torget_refresh_token',
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Import AFTER mocks are set up
import { useAuthStore } from '../../store/auth';

// ---- Helpers ----------------------------------------------------------------

// Build a minimal JWT with the given sub and email.
// Format: base64(header).base64(payload).base64(signature)
function makeJwt(sub: string, email: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub, email, exp: 9999999999 }));
  const sig = btoa('signature');
  return `${header}.${payload}.${sig}`;
}

// ---- Reset between tests ----------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    session: null,
    isLoading: false,
    error: null,
  });
  mockSetTokens.mockResolvedValue(undefined);
  mockClearTokens.mockResolvedValue(undefined);
  mockGetAccessToken.mockResolvedValue(null); // default: no stored token
});

// ---- Tests ------------------------------------------------------------------

describe('useAuthStore — signIn', () => {
  it('sets session on successful sign-in', async () => {
    const jwt = makeJwt('user-123', 'test@example.com');
    mockApiPost.mockResolvedValue({ accessToken: jwt, refreshToken: 'refresh-token' });

    await useAuthStore.getState().signIn('test@example.com', 'password123');

    expect(mockApiPost).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockSetTokens).toHaveBeenCalledWith(jwt, 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.session?.user.id).toBe('user-123');
    expect(state.session?.user.email).toBe('test@example.com');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error message on failed sign-in', async () => {
    mockApiPost.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

    await useAuthStore.getState().signIn('test@example.com', 'wrong-password');

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Noe gikk galt. Prøv igjen.');
  });

  it('sets loading to true while signing in, then false after', async () => {
    let resolveSignIn!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });

    mockApiPost.mockReturnValue(pendingPromise);

    const signInPromise = useAuthStore.getState().signIn('test@example.com', 'password123');
    expect(useAuthStore.getState().isLoading).toBe(true);

    resolveSignIn({ accessToken: makeJwt('u', 'e@e.com'), refreshToken: 'r' });
    await signInPromise;

    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('maps "already registered" API error to Norwegian message', async () => {
    mockApiPost.mockRejectedValue(new Error('already registered'));

    await useAuthStore.getState().signIn('existing@example.com', 'password');

    expect(useAuthStore.getState().error).toBe('E-posten er allerede registrert.');
  });
});

describe('useAuthStore — signUp', () => {
  it('sets session on successful registration', async () => {
    const jwt = makeJwt('user-456', 'new@example.com');
    mockApiPost.mockResolvedValue({ accessToken: jwt, refreshToken: 'refresh-token' });

    await useAuthStore.getState().signUp('new@example.com', 'password123', 'Ola Nordmann');

    expect(mockApiPost).toHaveBeenCalledWith('/auth/register', {
      email: 'new@example.com',
      password: 'password123',
      displayName: 'Ola Nordmann',
    });

    const state = useAuthStore.getState();
    expect(state.session?.user.id).toBe('user-456');
    expect(state.session?.user.email).toBe('new@example.com');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('sets error for duplicate email', async () => {
    mockApiPost.mockRejectedValue(new Error('already registered'));

    await useAuthStore.getState().signUp('existing@example.com', 'password123', 'Test');

    expect(useAuthStore.getState().error).toBe('E-posten er allerede registrert.');
  });
});

describe('useAuthStore — signOut', () => {
  it('clears session and tokens on sign-out', async () => {
    const jwt = makeJwt('user-123', 'test@example.com');
    useAuthStore.setState({ session: { user: { id: 'user-123', email: 'test@example.com' } } });
    mockApiPost.mockResolvedValue(undefined);

    await useAuthStore.getState().signOut();

    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('still clears local session even if server logout fails', async () => {
    useAuthStore.setState({ session: { user: { id: 'user-123', email: 'test@example.com' } } });
    mockApiPost.mockRejectedValue(new Error('Network error'));

    await useAuthStore.getState().signOut();

    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('useAuthStore — initialize', () => {
  it('restores session from stored access token', async () => {
    const jwt = makeJwt('user-789', 'stored@example.com');
    mockGetAccessToken.mockResolvedValue(jwt);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session?.user.id).toBe('user-789');
    expect(state.session?.user.email).toBe('stored@example.com');
    expect(state.isLoading).toBe(false);
  });

  it('sets session to null when no stored token exists', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('sets session to null when stored token has invalid JWT format', async () => {
    mockGetAccessToken.mockResolvedValue('not-a-jwt');

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('decodes JWT payload and sets user.id and user.email', async () => {
    const jwt = makeJwt('decoded-user', 'decoded@example.com');
    mockGetAccessToken.mockResolvedValue(jwt);

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.session?.user.id).toBe('decoded-user');
    expect(state.session?.user.email).toBe('decoded@example.com');
  });
});

describe('useAuthStore — clearError', () => {
  it('clears the error field', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
