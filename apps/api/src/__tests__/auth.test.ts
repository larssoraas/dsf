import Fastify, { FastifyInstance } from 'fastify';
import type Redis from 'ioredis';
import { authRoutes } from '../routes/auth';

// --- Module-level mocks ---

jest.mock('../lib/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../lib/jwt', () => ({
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../lib/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

// --- Imports after mocks ---
import { db } from '../lib/db';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt';
import { hashPassword, comparePassword } from '../lib/password';

const mockDb = db as jest.Mocked<typeof db>;
const mockSignAccessToken = signAccessToken as jest.MockedFunction<typeof signAccessToken>;
const mockSignRefreshToken = signRefreshToken as jest.MockedFunction<typeof signRefreshToken>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

// --- Helper: build a minimal Fastify app with the routes ---
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Decorate with mock redis and authenticate for protected routes
  const mockRedis = {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    blacklist: jest.fn().mockResolvedValue(undefined),
  };
  // Cast required: mock does not implement full Redis interface — only methods used by routes
  app.decorate('redis', mockRedis as unknown as Redis & { isBlacklisted(t: string): Promise<boolean>; blacklist(t: string, ttl: number): Promise<void> });
  app.decorate('authenticate', async () => {
    // No-op authenticate for testing — routes that need it will override
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

// --- Tests ---

describe('POST /auth/register', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates user and returns tokens', async () => {
    // Mock: no existing user
    mockDb.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof mockDb.select>);

    mockHashPassword.mockResolvedValue('hashed_pw');
    mockSignAccessToken.mockResolvedValue('access_token');
    mockSignRefreshToken.mockResolvedValue('refresh_token');

    mockDb.transaction.mockImplementation(async (fn) => {
      // Simulate the transaction callback — cast required: mock is not a full Drizzle tx
      const tx = {
        insert: () => ({
          values: () => ({
            returning: () =>
              Promise.resolve([{ id: 'user-1', email: 'test@example.com' }]),
          }),
        }),
      };
      return fn(tx as unknown as Parameters<typeof fn>[0]);
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload) as Record<string, unknown>;
    expect(body).toMatchObject({
      data: { accessToken: 'access_token', refreshToken: 'refresh_token', user: { id: 'user-1', email: 'test@example.com' } },
    });
  });

  it('returns 409 for duplicate email', async () => {
    // Mock: existing user found
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 'existing-user' }]),
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>);

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'existing@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/already in use/i);
  });

  it('returns 400 for invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'not-an-email', password: 'password123' },
    });

    // Fastify schema validation (format: email) fires first — message may vary by validator
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /auth/login', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns tokens for valid credentials', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: 'hashed_pw',
              },
            ]),
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>);

    mockComparePassword.mockResolvedValue(true);
    mockSignAccessToken.mockResolvedValue('access_token');
    mockSignRefreshToken.mockResolvedValue('refresh_token');

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as Record<string, unknown>;
    expect(body).toMatchObject({
      data: { accessToken: 'access_token', refreshToken: 'refresh_token' },
    });
  });

  it('returns 401 for wrong password', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              {
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: 'hashed_pw',
              },
            ]),
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>);

    mockComparePassword.mockResolvedValue(false);

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'wrong_password' },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload) as { error: string };
    // Generic message — must not reveal what's wrong
    expect(body.error).toMatch(/invalid email or password/i);
  });
});

describe('POST /auth/refresh', () => {
  let app: FastifyInstance;
  let mockRedis: { isBlacklisted: jest.Mock; blacklist: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Build app with controllable redis mock
    const appInstance = Fastify({ logger: false });
    mockRedis = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
      blacklist: jest.fn().mockResolvedValue(undefined),
    };
    // Cast required: mock does not implement full Redis interface — only methods used by routes
    appInstance.decorate('redis', mockRedis as unknown as Redis & { isBlacklisted(t: string): Promise<boolean>; blacklist(t: string, ttl: number): Promise<void> });
    appInstance.decorate('authenticate', async () => undefined);
    await appInstance.register(authRoutes, { prefix: '/auth' });
    await appInstance.ready();
    app = appInstance;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns new tokens for valid refresh token', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'user-1' });
    // Mock DB select for user lookup in refresh endpoint
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([{ id: 'user-1', email: 'test@example.com' }]),
        }),
      }),
    } as unknown as ReturnType<typeof mockDb.select>);
    mockSignAccessToken.mockResolvedValue('new_access_token');
    mockSignRefreshToken.mockResolvedValue('new_refresh_token');

    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'valid_refresh_token' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as Record<string, unknown>;
    expect(body).toMatchObject({
      data: { accessToken: 'new_access_token', refreshToken: 'new_refresh_token' },
    });
  });

  it('returns 401 for blacklisted refresh token', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'user-1' });
    mockRedis.isBlacklisted.mockResolvedValue(true);

    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'blacklisted_token' },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload) as { error: string };
    expect(body.error).toMatch(/revoked/i);
  });
});
