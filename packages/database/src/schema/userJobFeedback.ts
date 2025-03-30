// File path: packages/database/src/schema/userJobFeedback.ts
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { jobPostings } from "./jobPostings";

export const feedbackType = pgEnum("feedback_type", [
  "INTERESTED",
  "NOT_INTERESTED",
  "APPLIED",
  "SAVED",
  "VIEWED"
]);

export const userJobFeedback = pgTable("user_job_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  jobId: integer("job_id").references(() => jobPostings.id).notNull(),
  feedbackType: feedbackType("feedback_type").notNull(),
  reasons: text("reasons"),
  viewed: boolean("viewed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserJobFeedbackRecord = typeof userJobFeedback.$inferSelect;
export type NewUserJobFeedbackRecord = typeof userJobFeedback.$inferInsert;