// File path: packages/database/src/index.ts
// packages/database/index.ts

// Re-export db connection
export { db } from './db-connection';
import { eq, and, desc, sql} from 'drizzle-orm';
export { eq, and, desc, sql};
// Re-export schema (optional)
export * from './schema/documents';
export * from './schema/generations';
export * from './schema/parsings';
export * from './queries/parsingQueries';
export * from './queries/documentQueries';


