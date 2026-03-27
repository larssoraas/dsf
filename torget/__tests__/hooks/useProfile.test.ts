/**
 * Unit tests for hooks/useProfile.ts
 *
 * Focuses on:
 * - useMarkAsSold: calls api.patch('/listings/:id/sold')
 */

// ---- Mock setup -------------------------------------------------------------

const mockApiPatch = jest.fn();
const mockApiGet = jest.fn();

jest.mock('../../lib/api', () => ({
  api: {
    patch: (...args: unknown[]) => mockApiPatch(...args),
    get: (...args: unknown[]) => mockApiGet(...args),
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
    mockApiPatch.mockResolvedValue(undefined);
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValue({
      session: { user: { id: 'user-123' } },
    });
  });

  it('calls api.patch("/listings/listing-abc/sold")', async () => {
    const hook = useMarkAsSold('listing-abc');

    await hook.mutateAsync(undefined);

    expect(mockApiPatch).toHaveBeenCalledWith('/listings/listing-abc/sold');
  });

  it('throws if not logged in', async () => {
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValueOnce({
      session: null,
    });

    const hook = useMarkAsSold('listing-abc');

    await expect(hook.mutateAsync(undefined)).rejects.toThrow('Ikke innlogget');
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it('throws generic error when api.patch fails', async () => {
    mockApiPatch.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

    const hook = useMarkAsSold('listing-xyz');

    await expect(hook.mutateAsync(undefined)).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });
});
