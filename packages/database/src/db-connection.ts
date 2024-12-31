// File path: packages/database/src/db-connection.ts
// packages/database/db-connection.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { logger: true });