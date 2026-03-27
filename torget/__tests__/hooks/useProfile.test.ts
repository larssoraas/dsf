/**
 * Unit tests for hooks/useProfile.ts
 *
 * Focuses on:
 * - useMarkAsSold: calls supabase update with status='sold'
 */

// ---- Mock setup -------------------------------------------------------------

const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../store/auth', () => ({
  useAuthStore: jest.fn(() => ({
    session: { user: { id: 'user-123' } },
  })),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useMutation: jest.fn((options: { mutationFn: (...args: unknown[]) => unknown }) => ({
    mutate: (vars: unknown, callbacks?: { onSuccess?: () => void; onError?: (e: unknown) => void }) => {
      Promise.resolve(options.mutationFn(vars))
        .then(() => callbacks?.onSuccess?.())
        .catch((e: unknown) => callbacks?.onError?.(e));
    },
    mutateAsync: (vars: unknown) => options.mutationFn(vars),
    isPending: false,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

// Import after mocks
import { useMarkAsSold } from '../../hooks/useProfile';

// ---- Tests -----------------------------------------------------------------

describe('useMarkAsSold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls supabase update with status="sold"', async () => {
    // Set up the chain to capture calls
    const eqCalls: unknown[][] = [];
    const updateCalls: unknown[][] = [];

    jest.requireMock('../../lib/supabase').supabase.from = (table: string) => {
      mockFrom(table);
      const chain = {
        update: (...args: unknown[]) => {
          updateCalls.push(args);
          return chain;
        },
        eq: (...args: unknown[]) => {
          eqCalls.push(args);
          return chain;
        },
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return chain;
    };

    const hook = useMarkAsSold('listing-abc');

    // Call mutateAsync directly to test the mutation function
    await hook.mutateAsync(undefined);

    expect(mockFrom).toHaveBeenCalledWith('listings');
    expect(updateCalls[0]).toEqual([{ status: 'sold' }]);
    expect(eqCalls).toContainEqual(['id', 'listing-abc']);
    expect(eqCalls).toContainEqual(['seller_id', 'user-123']);
  });

  it('throws if not logged in', async () => {
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValueOnce({
      session: null,
    });

    const hook = useMarkAsSold('listing-abc');

    await expect(hook.mutateAsync(undefined)).rejects.toThrow('Ikke innlogget');
  });

  it('throws generic error when supabase returns an error', async () => {
    jest.requireMock('../../lib/supabase').supabase.from = (_table: string) => {
      const chain = {
        update: () => chain,
        eq: () => chain,
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve({ data: null, error: { message: 'DB error' } }).then(resolve),
      };
      return chain;
    };

    const hook = useMarkAsSold('listing-xyz');

    await expect(hook.mutateAsync(undefined)).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });
});
