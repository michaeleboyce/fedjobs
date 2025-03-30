// File path: packages/database/src/schema/jobPostings.ts
import { serial, text, varchar, pgTable, timestamp, boolean, integer, json, pgEnum } from "drizzle-orm/pg-core";
import { jobSources } from "./jobSources";

export const employmentType = pgEnum("employment_type", [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
  "REMOTE",
  "HYBRID",
  "OTHER"
]);

export const organizationType = pgEnum("organization_type", [
  "GOVERNMENT",
  "NONPROFIT",
  "PRIVATE",
  "PUBLIC",
  "ACADEMIC",
  "STARTUP",
  "OTHER"
]);

export const jobStatus = pgEnum("job_status", [
  "ACTIVE",
  "INACTIVE",
  "FILLED",
  "EXPIRED"
]);

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => jobSources.id).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  organizationType: organizationType("organization_type"),
  department: varchar("department", { length: 255 }),
  location: varchar("location", { length: 255 }),
  description: text("description").notNull(),
  salary: text("salary"),
  requirements: text("requirements"),
  url: text("url").notNull(),
  type: employmentType("type"),
  experience: varchar("experience", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  status: jobStatus("status").notNull().default("ACTIVE"),
  datePosted: timestamp("date_posted", { withTimezone: true }),
  dateScraped: timestamp("date_scraped", { withTimezone: true }).notNull().defaultNow(),
  // Store any additional structured data as JSON
  structuredData: json("structured_data").default({}),
  benefits: text("benefits"),
  skills: json("skills").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JobPostingRecord = typeof jobPostings.$inferSelect;
export type NewJobPostingRecord = typeof jobPostings.$inferInsert;