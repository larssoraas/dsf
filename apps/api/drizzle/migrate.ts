import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';

export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log('Running database migrations...');
  await migrate(db, {
    migrationsFolder: path.join(__dirname, 'migrations'),
  });
  console.log('Migrations complete.');

  await pool.end();
}

// Allow running directly: tsx drizzle/migrate.ts
if (require.main === module) {
  runMigrations().catch((err: unknown) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
