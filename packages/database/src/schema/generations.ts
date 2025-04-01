// File path: packages/database/src/schema/generations.ts
import { serial, boolean, text, integer, json, varchar, decimal, pgTable, pgEnum, timestamp } from "drizzle-orm/pg-core"
import { DOCUMENT_TYPES } from '@fedjobs/types';

export const generationType = pgEnum("generation_type", DOCUMENT_TYPES as unknown as [string, ...string[]])

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: generationType("generation_type").notNull(),
  isParagraph: boolean('is_paragraph').notNull(),
  prompt: text("prompt").notNull(),
  completion: text("completion").notNull(),
  temperature: decimal('temperature', { precision: 2, scale: 1}).notNull(),//Two total digits, one after the decimal place
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GenerationRecord  = typeof generations.$inferSelect;
export type NewGenerationRecord = typeof generations.$inferInsert;
