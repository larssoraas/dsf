import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import type { Profile, Listing } from '../lib/types';

export interface ProfileWithListings {
  profile: Profile;
  activeListings: Listing[];
  closedListings: Listing[];
}

// ---- Query functions -------------------------------------------------------

async function fetchOwnProfile(userId: string): Promise<ProfileWithListings> {
  const [profileRes, listingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('listings')
      .select('*')
      .eq('seller_id', userId)
      .in('status', ['active', 'sold', 'expired'])
      .order('created_at', { ascending: false }),
  ]);

  if (profileRes.error) {
    console.error('[useProfile] fetchOwnProfile:', profileRes.error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  if (listingsRes.error) {
    console.error('[useProfile] fetchOwnListings:', listingsRes.error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  const listings = (listingsRes.data ?? []) as Listing[];
  return {
    profile: profileRes.data as Profile,
    activeListings: listings.filter((l) => l.status === 'active'),
    closedListings: listings.filter((l) => l.status !== 'active'),
  };
}

async function fetchPublicProfile(userId: string): Promise<ProfileWithListings> {
  const [profileRes, listingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('listings')
      .select('*')
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);

  if (profileRes.error) {
    if (profileRes.error.code === 'PGRST116') {
      throw new Error('Profilen finnes ikke.');
    }
    console.error('[useProfile] fetchPublicProfile:', profileRes.error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  if (listingsRes.error) {
    console.error('[useProfile] fetchPublicListings:', listingsRes.error.message);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }

  const listings = (listingsRes.data ?? []) as Listing[];
  return {
    profile: profileRes.data as Profile,
    activeListings: listings,
    closedListings: [],
  };
}

export interface UpdateProfileInput {
  display_name?: string;
  city?: string;
  avatar_url?: string;
}

// ---- Hooks -----------------------------------------------------------------

export function useOwnProfile() {
  const { session } = useAuthStore();
  const userId = session?.user?.id ?? '';

  return useQuery({
    queryKey: ['profile', 'own', userId],
    queryFn: () => fetchOwnProfile(userId),
    enabled: Boolean(userId),
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', 'public', userId],
    queryFn: () => fetchPublicProfile(userId),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Ikke innlogget');

      const { error } = await supabase
        .from('profiles')
        .update(input)
        .eq('id', userId);

      if (error) {
        console.error('[useProfile] updateProfile:', error.message);
        throw new Error('Noe gikk galt. Prøv igjen.');
      }
    },
    onSuccess: () => {
      const userId = session?.user?.id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['profile', 'own', userId] });
        queryClient.invalidateQueries({ queryKey: ['profile', 'public', userId] });
      }
    },
  });
}

export function useMarkAsSold(listingId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const userId = session?.user?.id;
      if (!userId) throw new Error('Ikke innlogget');

      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId)
        .eq('seller_id', userId);

      if (error) {
        console.error('[useProfile] markAsSold:', error.message);
        throw new Error('Noe gikk galt. Prøv igjen.');
      }
    },
    onSuccess: () => {
      const userId = session?.user?.id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['profile', 'own', userId] });
      }
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
