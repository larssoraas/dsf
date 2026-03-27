/**
 * Unit tests for hooks/useReviews.ts
 *
 * Focuses on:
 * - useCreateReview: calls supabase insert with correct fields
 * - useCreateReview: throws when reviewer_id === reviewed_id (self-review)
 */

// ---- Mock setup -------------------------------------------------------------

const mockInsert = jest.fn();
const mockFromReviews = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFromReviews(...args);
      return {
        insert: (...insertArgs: unknown[]) => {
          mockInsert(...insertArgs);
          return Promise.resolve({ data: null, error: null });
        },
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    },
  },
}));

jest.mock('../../store/auth', () => ({
  useAuthStore: jest.fn(() => ({
    session: { user: { id: 'reviewer-111' } },
  })),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useMutation: jest.fn((options: { mutationFn: (vars: unknown) => unknown }) => ({
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
import { useCreateReview } from '../../hooks/useReviews';
import type { CreateReviewInput } from '../../hooks/useReviews';

// ---- Tests -----------------------------------------------------------------

describe('useCreateReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to logged-in state
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValue({
      session: { user: { id: 'reviewer-111' } },
    });
  });

  it('calls supabase insert with correct fields', async () => {
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewed_id: 'seller-222',
      listing_id: 'listing-333',
      rating: 4,
      comment: 'God handel!',
    };

    await hook.mutateAsync(input);

    expect(mockFromReviews).toHaveBeenCalledWith('reviews');
    expect(mockInsert).toHaveBeenCalledWith({
      reviewed_id: 'seller-222',
      listing_id: 'listing-333',
      rating: 4,
      comment: 'God handel!',
    });
  });

  it('sets comment to null when not provided', async () => {
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewed_id: 'seller-222',
      listing_id: 'listing-333',
      rating: 5,
    };

    await hook.mutateAsync(input);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null }),
    );
  });

  it('throws when reviewer_id equals reviewed_id (self-review)', async () => {
    // reviewer-111 tries to review themselves
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewed_id: 'reviewer-111', // same as session user id
      listing_id: 'listing-333',
      rating: 5,
    };

    await expect(hook.mutateAsync(input)).rejects.toThrow(
      'Du kan ikke anmelde deg selv.',
    );

    // supabase.insert should NOT have been called
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws if not logged in', async () => {
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValue({
      session: null,
    });

    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewed_id: 'seller-222',
      listing_id: 'listing-333',
      rating: 3,
    };

    await expect(hook.mutateAsync(input)).rejects.toThrow('Ikke innlogget');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws generic error when supabase returns an error', async () => {
    jest.requireMock('../../lib/supabase').supabase.from = (_table: string) => ({
      insert: (..._args: unknown[]) =>
        Promise.resolve({ data: null, error: { message: 'unique_violation' } }),
    });

    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewed_id: 'seller-222',
      listing_id: 'listing-333',
      rating: 2,
    };

    await expect(hook.mutateAsync(input)).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });
});
