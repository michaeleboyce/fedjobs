// File path: packages/database/src/schema/globalSourceCache.ts
import { serial, text, varchar, pgTable, timestamp, integer, json, pgEnum } from "drizzle-orm/pg-core";

export const globalCacheStatus = pgEnum("global_cache_status", [
  "ACTIVE",  // Cache is valid and can be used
  "STALE",   // Cache exists but is due for refresh
  "ERROR",   // Last crawl attempt failed
  "PENDING"  // Currently being crawled
]);

export const globalSourceCache = pgTable("global_source_cache", {
  id: serial("id").primaryKey(),
  // Normalized URL for matching
  normalizedUrl: text("normalized_url").notNull().unique(),
  // Original URL that was first crawled
  originalUrl: text("original_url").notNull(),
  // Domain extracted from URL for easier querying
  domain: varchar("domain", { length: 255 }).notNull(),
  // When the source was last crawled
  lastCrawled: timestamp("last_crawled", { withTimezone: true }),
  // When the cache entry expires and needs to be refreshed
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  // Default refresh frequency for this source
  refreshFrequency: varchar("refresh_frequency", { length: 20 }).default("DAILY"), // DAILY, WEEKLY, MANUAL
  // Current status of the cache
  status: globalCacheStatus("status").notNull().default("ACTIVE"),
  // Error message if the last crawl failed
  errorMessage: text("error_message"),
  // Number of jobs found in the last crawl
  jobCount: integer("job_count").default(0),
  // Number of users using this source
  userCount: integer("user_count").default(1),
  // Any additional metadata about the source
  metadata: json("metadata").default({}),
  // Standard timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Create an index on the normalized URL for faster lookups
// This will be automatically created based on the unique constraint

export type GlobalSourceCacheRecord = typeof globalSourceCache.$inferSelect;
export type NewGlobalSourceCacheRecord = typeof globalSourceCache.$inferInsert;