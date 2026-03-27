import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { Review, Profile } from '../lib/types';

export interface ReviewWithReviewer extends Review {
  reviewer: Pick<Profile, 'id' | 'displayName' | 'avatarUrl'>;
}

export interface CreateReviewInput {
  reviewedId: string;
  listingId: string;
  rating: number;
  comment?: string;
}

// ---- Query functions -------------------------------------------------------

async function fetchReviews(userId: string): Promise<ReviewWithReviewer[]> {
  try {
    return await api.get<ReviewWithReviewer[]>(`/profiles/${userId}/reviews`);
  } catch (err) {
    console.error('[useReviews] fetchReviews:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

// ---- Hooks -----------------------------------------------------------------

export function useReviews(userId: string) {
  return useQuery({
    queryKey: ['reviews', userId],
    queryFn: () => fetchReviews(userId),
    enabled: Boolean(userId),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const reviewerId = session?.user?.id;
      if (!reviewerId) throw new Error('Ikke innlogget');

      // Client-side self-review guard
      if (reviewerId === input.reviewedId) {
        throw new Error('Du kan ikke anmelde deg selv.');
      }

      try {
        // reviewer_id is set server-side from the JWT — do not send from client
        await api.post('/reviews', {
          reviewedId: input.reviewedId,
          listingId: input.listingId,
          rating: input.rating,
          comment: input.comment ?? null,
        });
      } catch (err) {
        console.error('[useReviews] createReview:', err);
        throw new Error('Noe gikk galt. Prøv igjen.');
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', input.reviewedId] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'public', input.reviewedId] });
    },
  });
}
