// File path: packages/database/src/index.ts
// packages/database/index.ts

// Re-export db connection
export { db } from './db-connection';
import { eq, and, desc, sql} from 'drizzle-orm';
export { eq, and, desc, sql};

// Re-export schema
export * from './schema/documents';
export * from './schema/generations';
export * from './schema/parsings';
export * from "./schema/positions"; 
export * from './schema/jobSources';
export * from './schema/jobPostings';
export * from './schema/userJobFeedback';
export * from './schema/globalSourceCache';

// Re-export repositories
export * from './repositories/documents';
export * from './repositories/generations'; 
export * from './repositories/parsings';
export * from './repositories/positions';
export * from './repositories/jobSources';
export * from './repositories/jobPostings';
export * from './repositories/userJobFeedback';
export * from './repositories/globalSourceCache';