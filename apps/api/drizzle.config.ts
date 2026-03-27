import type { Config } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
