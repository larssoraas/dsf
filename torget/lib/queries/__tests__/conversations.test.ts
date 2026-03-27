/**
 * Unit tests for lib/queries/conversations.ts
 *
 * Strategy: mock lib/api so no real HTTP calls are made.
 * Verifies correct api methods are called with correct arguments.
 */

// ---------------------------------------------------------------------------
// API mock
// ---------------------------------------------------------------------------

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('../../api', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }
  return {
    api: {
      get: (...args: unknown[]) => mockApiGet(...args),
      post: (...args: unknown[]) => mockApiPost(...args),
    },
    ApiError,
  };
});

const MockApiError = (
  jest.requireMock('../../api') as {
    ApiError: new (message: string, status: number) => Error & { status: number };
  }
).ApiError;

import {
  fetchConversations,
  startConversation,
  fetchMessages,
  sendMessage,
  respondToOffer,
} from '../conversations';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_CONVERSATION = {
  id: 'conv-1',
  listingId: 'listing-1',
  listingTitle: 'Brukt sykkel',
  buyerId: 'user-buyer',
  sellerId: 'user-seller',
  otherPartyName: 'Ola Nordmann',
  createdAt: '2026-01-01T00:00:00Z',
};

const SAMPLE_MESSAGE = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-buyer',
  content: 'Hei, er sykkelen fortsatt tilgjengelig?',
  type: 'message' as const,
  offerAmount: null,
  offerStatus: null,
  createdAt: '2026-01-01T10:00:00Z',
};

// ---------------------------------------------------------------------------
// fetchConversations
// ---------------------------------------------------------------------------

describe('fetchConversations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls api.get("/conversations") and returns conversations', async () => {
    mockApiGet.mockResolvedValue([SAMPLE_CONVERSATION]);

    const result = await fetchConversations();

    expect(mockApiGet).toHaveBeenCalledWith('/conversations');
    expect(result).toEqual([SAMPLE_CONVERSATION]);
  });

  it('throws "Noe gikk galt" when api.get fails', async () => {
    mockApiGet.mockRejectedValue(new Error('network error'));

    await expect(fetchConversations()).rejects.toThrow('Noe gikk galt');
  });
});

// ---------------------------------------------------------------------------
// startConversation
// ---------------------------------------------------------------------------

describe('startConversation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls api.post("/conversations") with listingId', async () => {
    mockApiPost.mockResolvedValue(SAMPLE_CONVERSATION);

    const result = await startConversation('listing-1');

    expect(mockApiPost).toHaveBeenCalledWith('/conversations', { listingId: 'listing-1' });
    expect(result).toEqual(SAMPLE_CONVERSATION);
  });

  it('throws "Kan ikke starte samtale med deg selv" on 400 error', async () => {
    mockApiPost.mockRejectedValue(new MockApiError('Bad request', 400));

    await expect(startConversation('listing-1')).rejects.toThrow(
      'Kan ikke starte samtale med deg selv',
    );
  });

  it('throws "Noe gikk galt" on non-400 errors', async () => {
    mockApiPost.mockRejectedValue(new Error('server error'));

    await expect(startConversation('listing-1')).rejects.toThrow('Noe gikk galt');
  });
});

// ---------------------------------------------------------------------------
// fetchMessages
// ---------------------------------------------------------------------------

describe('fetchMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls api.get("/conversations/:id/messages") and returns messages', async () => {
    mockApiGet.mockResolvedValue([SAMPLE_MESSAGE]);

    const result = await fetchMessages('conv-1');

    expect(mockApiGet).toHaveBeenCalledWith('/conversations/conv-1/messages');
    expect(result).toEqual([SAMPLE_MESSAGE]);
  });

  it('throws "Ingen tilgang" on 403 error', async () => {
    mockApiGet.mockRejectedValue(new MockApiError('Forbidden', 403));

    await expect(fetchMessages('conv-1')).rejects.toThrow('Ingen tilgang');
  });

  it('throws "Noe gikk galt" on other errors', async () => {
    mockApiGet.mockRejectedValue(new Error('server error'));

    await expect(fetchMessages('conv-1')).rejects.toThrow('Noe gikk galt');
  });
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe('sendMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls api.post with correct path and body for a regular message', async () => {
    mockApiPost.mockResolvedValue(SAMPLE_MESSAGE);

    const result = await sendMessage('conv-1', { content: 'Hei!', type: 'message' });

    expect(mockApiPost).toHaveBeenCalledWith('/conversations/conv-1/messages', {
      content: 'Hei!',
      type: 'message',
    });
    expect(result).toEqual(SAMPLE_MESSAGE);
  });

  it('calls api.post with offerAmount for an offer message', async () => {
    const offerMessage = { ...SAMPLE_MESSAGE, type: 'offer' as const, offerAmount: 300 };
    mockApiPost.mockResolvedValue(offerMessage);

    const result = await sendMessage('conv-1', {
      content: 'Vil du ta 300 kr?',
      type: 'offer',
      offerAmount: 300,
    });

    expect(mockApiPost).toHaveBeenCalledWith('/conversations/conv-1/messages', {
      content: 'Vil du ta 300 kr?',
      type: 'offer',
      offerAmount: 300,
    });
    expect(result.offerAmount).toBe(300);
  });

  it('throws "Noe gikk galt" when api.post fails', async () => {
    mockApiPost.mockRejectedValue(new Error('network error'));

    await expect(
      sendMessage('conv-1', { content: 'test', type: 'message' }),
    ).rejects.toThrow('Noe gikk galt');
  });
});

// ---------------------------------------------------------------------------
// respondToOffer
// ---------------------------------------------------------------------------

describe('respondToOffer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls api.post with correct accept path', async () => {
    mockApiPost.mockResolvedValue({ status: 'accepted' });

    const result = await respondToOffer('conv-1', 'msg-1', 'accept');

    expect(mockApiPost).toHaveBeenCalledWith('/conversations/conv-1/offers/msg-1/accept');
    expect(result).toEqual({ status: 'accepted' });
  });

  it('calls api.post with correct decline path', async () => {
    mockApiPost.mockResolvedValue({ status: 'declined' });

    const result = await respondToOffer('conv-1', 'msg-1', 'decline');

    expect(mockApiPost).toHaveBeenCalledWith('/conversations/conv-1/offers/msg-1/decline');
    expect(result).toEqual({ status: 'declined' });
  });

  it('throws "Kun selger kan svare på bud" on 403 error', async () => {
    mockApiPost.mockRejectedValue(new MockApiError('Forbidden', 403));

    await expect(respondToOffer('conv-1', 'msg-1', 'accept')).rejects.toThrow(
      'Kun selger kan svare på bud',
    );
  });

  it('throws "Budet er allerede behandlet" on 400 error', async () => {
    mockApiPost.mockRejectedValue(new MockApiError('Bad request', 400));

    await expect(respondToOffer('conv-1', 'msg-1', 'accept')).rejects.toThrow(
      'Budet er allerede behandlet',
    );
  });

  it('throws "Noe gikk galt" on other errors', async () => {
    mockApiPost.mockRejectedValue(new Error('server error'));

    await expect(respondToOffer('conv-1', 'msg-1', 'decline')).rejects.toThrow('Noe gikk galt');
  });
});
