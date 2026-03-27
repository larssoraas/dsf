import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('Running database migrations...');

    // Run each .sql file in order
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`  Applying ${file}...`);
      await pool.query(sql);
    }

    console.log('Migrations complete.');
  } finally {
    await pool.end();
  }
}

// Allow running directly: tsx drizzle/migrate.ts
if (require.main === module) {
  runMigrations().catch((err: unknown) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
