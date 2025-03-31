// File path: packages/database/src/schema/jobSources.ts
import { serial, text, varchar, pgTable, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { globalSourceCache } from "./globalSourceCache";

export const sourceStatus = pgEnum("source_status", [
  "ACTIVE", 
  "INACTIVE", 
  "ERROR",
  "PENDING"
]);

export const jobSources = pgTable("job_sources", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  keywords: text("keywords").default(""),
  lastScraped: timestamp("last_scraped", { withTimezone: true }),
  status: sourceStatus("status").notNull().default("ACTIVE"),
  errorMessage: text("error_message"),
  refreshFrequency: varchar("refresh_frequency", { length: 20 }).default("DAILY"), // DAILY, WEEKLY, MANUAL
  // New field to link to global cache
  globalCacheId: integer("global_cache_id").references(() => globalSourceCache.id),
  // Flag to indicate whether this source is using cached data
  usedCache: boolean("used_cache").default(false),
  // Flag to indicate whether the last update used cached data
  usedCacheForLastUpdate: boolean("used_cache_for_last_update").default(false),
  // Standard timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobSourceRecord = typeof jobSources.$inferSelect;
export type NewJobSourceRecord = typeof jobSources.$inferInsert;