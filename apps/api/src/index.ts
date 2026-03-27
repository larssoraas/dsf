import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { runMigrations } from '../drizzle/migrate';
import redisPlugin from './plugins/redis';
import minioPlugin from './plugins/minio';
import authPlugin from './plugins/auth';
import { authRoutes } from './routes/auth';
import { listingsRoutes } from './routes/listings';
import { profilesRoutes } from './routes/profiles';
import { reviewsRoutes } from './routes/reviews';
import { uploadsRoutes } from './routes/uploads';

const port = parseInt(process.env.API_PORT ?? '3000', 10);

async function start(): Promise<void> {
  // Validate required configuration at startup
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required');
  }
  if (!process.env.MINIO_ENDPOINT) {
    throw new Error('MINIO_ENDPOINT is required');
  }
  if (!process.env.MINIO_ACCESS_KEY) {
    throw new Error('MINIO_ACCESS_KEY is required');
  }
  if (!process.env.MINIO_SECRET_KEY) {
    throw new Error('MINIO_SECRET_KEY is required');
  }

  await runMigrations();

  const app = Fastify({ logger: true });

  // Plugins
  await app.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' });
  await app.register(multipart);
  await app.register(redisPlugin);
  await app.register(minioPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(listingsRoutes, { prefix: '/listings' });
  await app.register(profilesRoutes, { prefix: '/profiles' });
  await app.register(reviewsRoutes); // Reviews use /profiles/:id/reviews + /reviews paths
  await app.register(uploadsRoutes, { prefix: '/uploads' });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  await app.listen({ port, host: '0.0.0.0' });
}

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
