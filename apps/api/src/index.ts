import Fastify from 'fastify';
import { runMigrations } from '../drizzle/migrate';

const port = parseInt(process.env.API_PORT ?? '3000', 10);

async function start(): Promise<void> {
  // Validate required configuration at startup
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  await runMigrations();

  const app = Fastify({ logger: true });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  await app.listen({ port, host: '0.0.0.0' });
}

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
