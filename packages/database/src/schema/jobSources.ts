// File path: packages/database/src/schema/jobSources.ts
import { serial, text, varchar, pgTable, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobSourceRecord = typeof jobSources.$inferSelect;
export type NewJobSourceRecord = typeof jobSources.$inferInsert;