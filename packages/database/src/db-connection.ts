// File path: packages/database/src/db-connection.ts
// packages/database/src/db-connection.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Get the database URL
const databaseUrl = process.env.DATABASE_URL || '';

// Create the neon client
const sql = neon(databaseUrl);

// Initialize the database with the client
export const db = drizzle(sql, { logger: true });