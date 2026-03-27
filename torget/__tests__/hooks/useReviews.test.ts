/**
 * Unit tests for hooks/useReviews.ts
 *
 * Focuses on:
 * - useCreateReview: calls api.post('/reviews') with correct fields
 * - useCreateReview: reviewer_id is NOT sent (set server-side)
 * - useCreateReview: throws when reviewer === reviewed (self-review guard)
 */

// ---- Mock setup -------------------------------------------------------------

const mockApiPost = jest.fn();
const mockApiGet = jest.fn();

jest.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
    get: (...args: unknown[]) => mockApiGet(...args),
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
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValue({
      session: { user: { id: 'reviewer-111' } },
    });
    mockApiPost.mockResolvedValue(undefined);
  });

  it('calls api.post("/reviews") with correct fields', async () => {
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewedId: 'seller-222',
      listingId: 'listing-333',
      rating: 4,
      comment: 'God handel!',
    };

    await hook.mutateAsync(input);

    expect(mockApiPost).toHaveBeenCalledWith('/reviews', {
      reviewedId: 'seller-222',
      listingId: 'listing-333',
      rating: 4,
      comment: 'God handel!',
    });
  });

  it('does NOT include reviewer_id in the request body (set server-side)', async () => {
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewedId: 'seller-222',
      listingId: 'listing-333',
      rating: 5,
    };

    await hook.mutateAsync(input);

    const callBody = mockApiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(callBody).not.toHaveProperty('reviewerId');
    expect(callBody).not.toHaveProperty('reviewer_id');
  });

  it('sets comment to null when not provided', async () => {
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewedId: 'seller-222',
      listingId: 'listing-333',
      rating: 5,
    };

    await hook.mutateAsync(input);

    expect(mockApiPost).toHaveBeenCalledWith(
      '/reviews',
      expect.objectContaining({ comment: null }),
    );
  });

  it('throws when reviewer equals reviewed (self-review guard)', async () => {
    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewedId: 'reviewer-111', // same as session user id
      listingId: 'listing-333',
      rating: 5,
    };

    await expect(hook.mutateAsync(input)).rejects.toThrow('Du kan ikke anmelde deg selv.');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('throws if not logged in', async () => {
    jest.requireMock('../../store/auth').useAuthStore.mockReturnValue({
      session: null,
    });

    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewedId: 'seller-222',
      listingId: 'listing-333',
      rating: 3,
    };

    await expect(hook.mutateAsync(input)).rejects.toThrow('Ikke innlogget');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('throws generic error when api.post fails', async () => {
    mockApiPost.mockRejectedValue(new Error('Noe gikk galt. Prøv igjen.'));

    const hook = useCreateReview();

    const input: CreateReviewInput = {
      reviewedId: 'seller-222',
      listingId: 'listing-333',
      rating: 2,
    };

    await expect(hook.mutateAsync(input)).rejects.toThrow('Noe gikk galt. Prøv igjen.');
  });
});
