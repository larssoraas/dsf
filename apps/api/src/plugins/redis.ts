import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis & {
      isBlacklisted(token: string): Promise<boolean>;
      blacklist(token: string, ttlSeconds: number): Promise<void>;
    };
  }
}

async function redisPlugin(fastify: FastifyInstance): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  const client = new Redis(redisUrl);

  client.on('error', (err: Error) => {
    console.error('Redis connection error:', err.message);
  });

  const extendedClient = client as Redis & {
    isBlacklisted(token: string): Promise<boolean>;
    blacklist(token: string, ttlSeconds: number): Promise<void>;
  };

  extendedClient.isBlacklisted = async (token: string): Promise<boolean> => {
    const result = await client.get(`blacklist:${token}`);
    return result !== null;
  };

  extendedClient.blacklist = async (
    token: string,
    ttlSeconds: number,
  ): Promise<void> => {
    await client.set(`blacklist:${token}`, '1', 'EX', ttlSeconds);
  };

  fastify.decorate('redis', extendedClient);

  fastify.addHook('onClose', async () => {
    await client.quit();
  });
}

export default fp(redisPlugin, { name: 'redis' });
