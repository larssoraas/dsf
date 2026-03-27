import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db';
import { users, profiles } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../lib/password';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt';

// 7 days in seconds
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

interface RegisterBody {
  email: string;
  password: string;
  displayName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface LogoutBody {
  refreshToken: string;
}

interface RefreshBody {
  refreshToken: string;
}

function isValidEmail(email: string): boolean {
  // Simple but effective email format check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            displayName: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RegisterBody }>,
      reply: FastifyReply,
    ) => {
      const { email, password, displayName } = request.body;

      if (!email || !isValidEmail(email)) {
        return reply.code(400).send({ error: 'Invalid email address' });
      }

      if (!password || password.length < 8) {
        return reply
          .code(400)
          .send({ error: 'Password must be at least 8 characters' });
      }

      // Check for existing user
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return reply.code(409).send({ error: 'Email already in use' });
      }

      const passwordHash = await hashPassword(password);

      // Create user + profile atomically
      const result = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({ email: email.toLowerCase(), passwordHash })
          .returning({ id: users.id, email: users.email });

        if (!newUser) {
          throw new Error('Failed to create user');
        }

        await tx.insert(profiles).values({
          id: newUser.id,
          displayName: displayName ?? null,
        });

        return newUser;
      });

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(result.id, result.email),
        signRefreshToken(result.id),
      ]);

      return reply.code(201).send({
        data: { accessToken, refreshToken, user: { id: result.id, email: result.email } },
      });
    },
  );

  fastify.post(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: LoginBody }>,
      reply: FastifyReply,
    ) => {
      const { email, password } = request.body;

      if (!email || !password) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const [user] = await db
        .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        // Use consistent timing to avoid user enumeration
        await comparePassword(password, '$2b$12$invalidhashfortimingggggggggggggggggggggggggggg');
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(user.id, user.email),
        signRefreshToken(user.id),
      ]);

      return reply.send({
        data: { accessToken, refreshToken, user: { id: user.id, email: user.email } },
      });
    },
  );

  fastify.post<{ Body: LogoutBody }>(
    '/logout',
    {
      preHandler: fastify.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      if (!refreshToken) {
        return reply.code(400).send({ error: 'refreshToken is required' });
      }

      await fastify.redis.blacklist(refreshToken, REFRESH_TTL_SECONDS);

      return reply.code(204).send();
    },
  );

  fastify.post(
    '/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RefreshBody }>,
      reply: FastifyReply,
    ) => {
      const { refreshToken } = request.body;

      if (!refreshToken) {
        return reply.code(400).send({ error: 'refreshToken is required' });
      }

      let sub: string;
      try {
        const payload = await verifyToken(refreshToken);
        sub = payload.sub;
      } catch (err) {
        console.error('Refresh token verification failed:', err instanceof Error ? err.message : 'unknown error');
        return reply.code(401).send({ error: 'Invalid or expired refresh token' });
      }

      const isBlacklisted = await fastify.redis.isBlacklisted(refreshToken);
      if (isBlacklisted) {
        return reply.code(401).send({ error: 'Refresh token has been revoked' });
      }

      // Fetch user to get email for access token claim
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, sub))
        .limit(1);

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      // Rotation: blacklist old token BEFORE issuing new ones (prevents race condition)
      await fastify.redis.blacklist(refreshToken, REFRESH_TTL_SECONDS);

      const [accessToken, newRefreshToken] = await Promise.all([
        signAccessToken(user.id, user.email),
        signRefreshToken(user.id),
      ]);

      return reply.send({ data: { accessToken, refreshToken: newRefreshToken } });
    },
  );
}
