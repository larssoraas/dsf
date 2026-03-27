import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { verifyToken } from '../lib/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
  }
  interface FastifyRequest {
    user: { id: string };
  }
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const authenticate: preHandlerHookHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    let sub: string;
    try {
      const payload = await verifyToken(token);
      sub = payload.sub;
    } catch (err) {
      console.error('JWT verification failed:', err);
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }

    const isBlacklisted = await fastify.redis.isBlacklisted(token);
    if (isBlacklisted) {
      return reply.code(401).send({ error: 'Token has been revoked' });
    }

    request.user = { id: sub };
  };

  fastify.decorate('authenticate', authenticate);
}

export default fp(authPlugin, { name: 'auth', dependencies: ['redis'] });
