import { api, ApiError } from '../api';
import type { Conversation, Message } from '@/lib/types';

export type { Conversation, Message } from '@/lib/types';

export interface CreateMessageInput {
  content: string;
  type?: 'message' | 'offer';
  offerAmount?: number;
}

export async function fetchConversations(): Promise<Conversation[]> {
  try {
    return await api.get<Conversation[]>('/conversations');
  } catch (err) {
    console.error('[conversations] fetchConversations error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function startConversation(listingId: string): Promise<Conversation> {
  try {
    return await api.post<Conversation>('/conversations', { listingId });
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      throw new Error('Kan ikke starte samtale med deg selv');
    }
    console.error('[conversations] startConversation error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  try {
    return await api.get<Message[]>(`/conversations/${conversationId}/messages`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      throw new Error('Ingen tilgang til denne samtalen');
    }
    console.error('[conversations] fetchMessages error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function sendMessage(
  conversationId: string,
  input: CreateMessageInput,
): Promise<Message> {
  try {
    return await api.post<Message>(`/conversations/${conversationId}/messages`, input);
  } catch (err) {
    console.error('[conversations] sendMessage error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}

export async function respondToOffer(
  conversationId: string,
  msgId: string,
  action: 'accept' | 'decline',
): Promise<{ status: string }> {
  try {
    return await api.post<{ status: string }>(
      `/conversations/${conversationId}/offers/${msgId}/${action}`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      throw new Error('Kun selger kan svare på bud');
    }
    if (err instanceof ApiError && err.status === 400) {
      throw new Error('Budet er allerede behandlet');
    }
    console.error('[conversations] respondToOffer error:', err);
    throw new Error('Noe gikk galt. Prøv igjen.');
  }
}
