import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import type { Profile, Listing } from '../lib/types';

export interface ProfileWithListings {
  profile: Profile;
  activeListings: Listing[];
  closedListings: Listing[];
}

export interface UpdateProfileInput {
  displayName?: string;
  city?: string;
  avatarUrl?: string;
}

// ---- Query functions -------------------------------------------------------

async function fetchProfile(userId: string): Promise<Profile> {
  try {
    return await api.get<Profile>(`/profiles/${userId}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      throw new Error('Profilen finnes ikke.');
    }
    console.error('[useProfile] fetchProfile:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

async function fetchOwnProfile(userId: string): Promise<ProfileWithListings> {
  const [profile, listings] = await Promise.all([
    fetchProfile(userId),
    api.get<Listing[]>('/listings', { sellerId: userId }).catch((err) => {
      console.error('[useProfile] fetchOwnListings:', err);
      throw new Error('Noe gikk galt. Prøv igjen.');
    }),
  ]);

  return {
    profile,
    activeListings: listings.filter((l) => l.status === 'active'),
    closedListings: listings.filter((l) => l.status !== 'active'),
  };
}

async function fetchPublicProfile(userId: string): Promise<ProfileWithListings> {
  const [profile, listings] = await Promise.all([
    fetchProfile(userId),
    api.get<Listing[]>('/listings', { sellerId: userId, status: 'active' }).catch((err) => {
      console.error('[useProfile] fetchPublicListings:', err);
      throw new Error('Noe gikk galt. Prøv igjen.');
    }),
  ]);

  return {
    profile,
    activeListings: listings,
    closedListings: [],
  };
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
      if (!session?.user?.id) throw new Error('Ikke innlogget');

      try {
        await api.patch('/profiles/me', input);
      } catch (err) {
        console.error('[useProfile] updateProfile:', err);
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
      if (!session?.user?.id) throw new Error('Ikke innlogget');

      try {
        await api.patch(`/listings/${listingId}/sold`);
      } catch (err) {
        console.error('[useProfile] markAsSold:', err);
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
