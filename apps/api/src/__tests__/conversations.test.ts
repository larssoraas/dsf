/**
 * Unit tests for apps/api/src/routes/conversations.ts
 *
 * Focuses on participant-check logic (403 for non-participants),
 * self-conversation prevention (400), and basic happy-path responses.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { conversationsRoutes } from '../routes/conversations';

// --- Module-level mocks ---

jest.mock('../lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    execute: jest.fn(),
  },
}));

import { db } from '../lib/db';

const mockDb = db as jest.Mocked<typeof db>;

// Real UUIDs required by Fastify uuid format validation
const LISTING_ID = '00000000-0000-4000-8000-000000000001';
const CONV_ID = '00000000-0000-4000-8000-000000000002';
const BUYER_ID = '00000000-0000-4000-8000-000000000003';
const SELLER_ID = '00000000-0000-4000-8000-000000000004';
const OUTSIDER_ID = '00000000-0000-4000-8000-000000000005';

// --- Helper: build a minimal Fastify app ---

async function buildApp(userId?: string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('authenticate', async (request: { user: { id: string } }) => {
    if (userId) {
      request.user = { id: userId };
    }
  });

  await app.register(conversationsRoutes, { prefix: '/conversations' });
  await app.ready();
  return app;
}

// --- Helpers ---

function mockSelectChain(result: unknown[]) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
  mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);
  return chain;
}

// --- Tests ---

describe('POST /conversations', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp(BUYER_ID);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 400 when buyer is the seller', async () => {
    // Listing where sellerId === the authenticated user (BUYER_ID)
    mockSelectChain([{ id: LISTING_ID, sellerId: BUYER_ID }]);

    const response = await app.inject({
      method: 'POST',
      url: '/conversations',
      payload: { listingId: LISTING_ID },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/deg selv/);
  });

  it('returns 404 when listing does not exist', async () => {
    mockSelectChain([]);

    const response = await app.inject({
      method: 'POST',
      url: '/conversations',
      payload: { listingId: LISTING_ID },
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 201 and creates conversation for valid buyer', async () => {
    // Listing with a different seller
    mockSelectChain([{ id: LISTING_ID, sellerId: SELLER_ID }]);

    const fakeConversation = {
      id: CONV_ID,
      listingId: LISTING_ID,
      buyerId: BUYER_ID,
      sellerId: SELLER_ID,
      createdAt: new Date(),
    };

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([fakeConversation]),
    } as unknown as ReturnType<typeof mockDb.insert>);

    const response = await app.inject({
      method: 'POST',
      url: '/conversations',
      payload: { listingId: LISTING_ID },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload) as { data: { id: string } };
    expect(body.data.id).toBe(CONV_ID);
  });
});

describe('GET /conversations/:id/messages — participant check', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('returns 403 when requesting user is not a participant', async () => {
    app = await buildApp(OUTSIDER_ID);
    jest.clearAllMocks();

    // Conversation between buyer and seller — outsider is neither
    mockSelectChain([{ buyerId: BUYER_ID, sellerId: SELLER_ID }]);

    const response = await app.inject({
      method: 'GET',
      url: `/conversations/${CONV_ID}/messages`,
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/tilgang/i);
  });

  it('returns 200 for the buyer', async () => {
    app = await buildApp(BUYER_ID);
    jest.clearAllMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ buyerId: BUYER_ID, sellerId: SELLER_ID }]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'GET',
      url: `/conversations/${CONV_ID}/messages`,
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 200 for the seller', async () => {
    app = await buildApp(SELLER_ID);
    jest.clearAllMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ buyerId: BUYER_ID, sellerId: SELLER_ID }]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'GET',
      url: `/conversations/${CONV_ID}/messages`,
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 404 when conversation does not exist', async () => {
    app = await buildApp(BUYER_ID);
    jest.clearAllMocks();

    mockSelectChain([]);

    const response = await app.inject({
      method: 'GET',
      url: `/conversations/${CONV_ID}/messages`,
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('POST /conversations/:id/messages — participant check', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('returns 403 when non-participant tries to send a message', async () => {
    app = await buildApp(OUTSIDER_ID);
    jest.clearAllMocks();

    mockSelectChain([{ buyerId: BUYER_ID, sellerId: SELLER_ID }]);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/messages`,
      payload: { content: 'Hei!', type: 'message' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 400 when type is offer but offerAmount is 0', async () => {
    app = await buildApp(BUYER_ID);
    jest.clearAllMocks();

    mockSelectChain([{ buyerId: BUYER_ID, sellerId: SELLER_ID }]);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/messages`,
      payload: { content: 'Vil du ta 0 kr?', type: 'offer', offerAmount: 0 },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/beløp/i);
  });

  it('returns 201 when buyer sends a valid message', async () => {
    app = await buildApp(BUYER_ID);
    jest.clearAllMocks();

    mockSelectChain([{ buyerId: BUYER_ID, sellerId: SELLER_ID }]);

    const fakeMessage = {
      id: 'msg-uuid',
      conversationId: CONV_ID,
      senderId: BUYER_ID,
      content: 'Hei!',
      type: 'message',
      offerAmount: null,
      offerStatus: null,
      createdAt: new Date(),
    };

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([fakeMessage]),
    } as unknown as ReturnType<typeof mockDb.insert>);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/messages`,
      payload: { content: 'Hei!', type: 'message' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload) as { data: { id: string } };
    expect(body.data.id).toBe('msg-uuid');
  });
});

// ---------------------------------------------------------------------------
// Shared offer message fixture
// ---------------------------------------------------------------------------

const OFFER_MSG_ID = '00000000-0000-4000-8000-000000000010';

const fakeOfferMsg = {
  id: OFFER_MSG_ID,
  conversationId: CONV_ID,
  senderId: BUYER_ID,
  content: 'Bud: 500 kr',
  type: 'offer',
  offerAmount: 500,
  offerStatus: null,
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// POST /conversations/:id/offers/:msgId/accept
// ---------------------------------------------------------------------------

describe('POST /conversations/:id/offers/:msgId/accept', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('returns 403 when caller is not the seller', async () => {
    app = await buildApp(BUYER_ID);
    jest.clearAllMocks();

    // Conversation where SELLER_ID is seller, not BUYER_ID
    mockSelectChain([{ sellerId: SELLER_ID, listingId: LISTING_ID }]);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/offers/${OFFER_MSG_ID}/accept`,
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/selger/i);
  });

  it('returns 400 when offer is already processed', async () => {
    app = await buildApp(SELLER_ID);
    jest.clearAllMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ sellerId: SELLER_ID, listingId: LISTING_ID }]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ ...fakeOfferMsg, offerStatus: 'declined' }]),
      } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/offers/${OFFER_MSG_ID}/accept`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/allerede behandlet/i);
  });

  it('returns 200 with status accepted when seller accepts a pending offer', async () => {
    app = await buildApp(SELLER_ID);
    jest.clearAllMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ sellerId: SELLER_ID, listingId: LISTING_ID }]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([fakeOfferMsg]),
      } as unknown as ReturnType<typeof mockDb.select>);

    // Mock transaction
    (mockDb as unknown as { transaction: jest.Mock }).transaction = jest.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          }),
        };
        await fn(mockTx);
      },
    );

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/offers/${OFFER_MSG_ID}/accept`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { status: string };
    expect(body.status).toBe('accepted');
  });
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/offers/:msgId/decline
// ---------------------------------------------------------------------------

describe('POST /conversations/:id/offers/:msgId/decline', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('returns 403 when caller is not the seller', async () => {
    app = await buildApp(BUYER_ID);
    jest.clearAllMocks();

    mockSelectChain([{ sellerId: SELLER_ID }]);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/offers/${OFFER_MSG_ID}/decline`,
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/selger/i);
  });

  it('returns 400 when offer is already processed', async () => {
    app = await buildApp(SELLER_ID);
    jest.clearAllMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ sellerId: SELLER_ID }]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ ...fakeOfferMsg, offerStatus: 'accepted' }]),
      } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/offers/${OFFER_MSG_ID}/decline`,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/allerede behandlet/i);
  });

  it('returns 200 with status declined when seller declines a pending offer', async () => {
    app = await buildApp(SELLER_ID);
    jest.clearAllMocks();

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ sellerId: SELLER_ID }]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([fakeOfferMsg]),
      } as unknown as ReturnType<typeof mockDb.select>);

    mockDb.update = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue({ rowCount: 1 }),
    }) as unknown as typeof mockDb.update;

    const response = await app.inject({
      method: 'POST',
      url: `/conversations/${CONV_ID}/offers/${OFFER_MSG_ID}/decline`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { status: string };
    expect(body.status).toBe('declined');
  });
});
