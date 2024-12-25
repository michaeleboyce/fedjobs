// packages/database/index.ts

// Re-export db connection
export { db } from './db-connection';
import { eq, and, desc } from 'drizzle-orm';
export { eq, and, desc};
// Re-export schema (optional)
export * from './schema/documents';
export * from './schema/generations';
export * from './schema/parsings';
export * from './queries/parsingQueries';
export * from './dbService';


