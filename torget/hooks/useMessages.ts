import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMessages, sendMessage, respondToOffer } from '@/lib/queries/conversations';
import type { Message, CreateMessageInput } from '@/lib/queries/conversations';

export function useMessages(conversationId: string) {
  const query = useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 3000,
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMessageInput) => sendMessage(conversationId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}

export function useRespondToOffer(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ msgId, action }: { msgId: string; action: 'accept' | 'decline' }) =>
      respondToOffer(conversationId, msgId, action),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      if (variables.action === 'accept') {
        void queryClient.invalidateQueries({ queryKey: ['listings'] });
      }
    },
  });
}
