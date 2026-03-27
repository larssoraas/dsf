import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import type { Review } from '../lib/types';

export interface ReviewWithReviewer extends Review {
  reviewer: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CreateReviewInput {
  reviewed_id: string;
  listing_id: string;
  rating: number;
  comment?: string;
}

// ---- Query functions -------------------------------------------------------

async function fetchReviews(userId: string): Promise<ReviewWithReviewer[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      reviewer_id,
      reviewed_id,
      listing_id,
      rating,
      comment,
      created_at,
      reviewer:profiles!reviews_reviewer_id_fkey (
        id,
        display_name,
        avatar_url
      )
    `,
    )
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[useReviews] fetchReviews:', error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  return (data ?? []) as unknown as ReviewWithReviewer[];
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
      if (reviewerId === input.reviewed_id) {
        throw new Error('Du kan ikke anmelde deg selv.');
      }

      const { error } = await supabase.from('reviews').insert({
        reviewed_id: input.reviewed_id,
        listing_id: input.listing_id,
        rating: input.rating,
        comment: input.comment ?? null,
      });

      if (error) {
        console.error('[useReviews] createReview:', error.message);
        throw new Error('Noe gikk galt. Prøv igjen.');
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', input.reviewed_id] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'public', input.reviewed_id] });
    },
  });
}
