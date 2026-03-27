import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { fetchConversations } from '@/lib/queries/conversations';
import type { Conversation } from '@/lib/types';

export function useConversations() {
  const { session } = useAuthStore();

  const query = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: Boolean(session),
  });

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
