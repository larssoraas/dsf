import Fastify, { FastifyInstance } from 'fastify';
import { listingsRoutes } from '../routes/listings';

// --- Module-level mocks ---

jest.mock('../lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    execute: jest.fn(),
  },
}));

// --- Imports after mocks ---
import { db } from '../lib/db';

const mockDb = db as jest.Mocked<typeof db>;

// --- Helper: build a minimal Fastify app ---
async function buildApp(userId?: string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Stub authenticate to inject a user (or do nothing for anon routes)
  app.decorate('authenticate', async (request: { user: { id: string } }) => {
    if (userId) {
      request.user = { id: userId };
    }
  });

  await app.register(listingsRoutes, { prefix: '/listings' });
  await app.ready();
  return app;
}

// Helper: build a chainable select mock
function mockSelectChain(result: unknown[]) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue(result),
  };
  mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);
  return chain;
}

// --- Tests ---

describe('GET /listings', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns list of listings (anonymous)', async () => {
    const fakeListing = {
      listing: {
        id: 'listing-1',
        sellerId: 'user-1',
        title: 'Test listing',
        description: null,
        price: 100,
        category: 'electronics',
        condition: 'good',
        listingType: 'sale',
        status: 'active',
        location: null,
        city: 'Oslo',
        viewCount: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        searchVector: null,
      },
      profile: {
        id: 'user-1',
        displayName: 'Selger',
        avatarUrl: null,
        avgRating: null,
        city: 'Oslo',
      },
    };

    // First select call: listings + profiles
    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([fakeListing]),
      } as unknown as ReturnType<typeof mockDb.select>)
      // Second select call: images
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'GET',
      url: '/listings',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('GET /listings/search', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('performs tsvector search and returns results', async () => {
    const fakeListing = {
      listing: {
        id: 'listing-2',
        sellerId: 'user-1',
        title: 'iPhone 13',
        description: null,
        price: 5000,
        category: 'electronics',
        condition: 'good',
        listingType: 'sale',
        status: 'active',
        location: null,
        city: null,
        viewCount: 2,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        searchVector: null,
      },
      profile: null,
    };

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([fakeListing]),
      } as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'GET',
      url: '/listings/search?query=iphone&category=electronics',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('GET /listings/:id', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a listing by id', async () => {
    const fakeListing = {
      listing: {
        id: 'listing-1',
        sellerId: 'user-1',
        title: 'Test',
        description: null,
        price: null,
        category: 'other',
        condition: 'used',
        listingType: 'free',
        status: 'active',
        location: null,
        city: null,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        searchVector: null,
      },
      profile: null,
    };

    mockDb.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([fakeListing]),
      } as unknown as ReturnType<typeof mockDb.select>)
      // Images query
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof mockDb.select>);

    // Mock update (fire-and-forget view count)
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      catch: jest.fn(),
    } as unknown as ReturnType<typeof mockDb.update>);

    const response = await app.inject({
      method: 'GET',
      url: '/listings/listing-1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { data: { id: string } };
    expect(body.data.id).toBe('listing-1');
  });

  it('returns 404 for unknown listing id', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'GET',
      url: '/listings/nonexistent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/not found/i);
  });
});

describe('POST /listings', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp('authenticated-user-id');
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires auth and returns created listing', async () => {
    const newListing = {
      id: 'new-listing-id',
      sellerId: 'authenticated-user-id',
      title: 'New Listing',
      description: null,
      price: 200,
      category: 'electronics',
      condition: 'good',
      listingType: 'sale',
      status: 'active',
      location: null,
      city: null,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      searchVector: null,
    };

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([newListing]),
    } as unknown as ReturnType<typeof mockDb.insert>);

    const response = await app.inject({
      method: 'POST',
      url: '/listings',
      payload: {
        title: 'New Listing',
        price: 200,
        category: 'electronics',
        condition: 'good',
        listingType: 'sale',
        imageUrls: [],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload) as { data: { id: string; sellerId: string } };
    expect(body.data.id).toBe('new-listing-id');
    expect(body.data.sellerId).toBe('authenticated-user-id');
  });
});

describe('PATCH /listings/:id/sold', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp('owner-user-id');
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 403 when user is not the listing owner', async () => {
    // Listing exists but belongs to a different user
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { id: 'listing-1', sellerId: 'different-user-id' },
      ]),
    } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'PATCH',
      url: '/listings/listing-1/sold',
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/forbidden/i);
  });
});
