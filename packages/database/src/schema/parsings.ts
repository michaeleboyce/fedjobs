import { serial, boolean, text, integer, json, varchar, decimal, pgTable, pgEnum, timestamp } from "drizzle-orm/pg-core"
import { DOCUMENT_TYPES, GENERATION_TYPES } from '@fedjobs/utils';
import { documents as documentsTable } from './documents';
export const parsingType = pgEnum("parsing_type", DOCUMENT_TYPES)

export const parsings = pgTable("parsings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: parsingType("parsing_type").notNull(),
  prompt: text("prompt").notNull(),
  completion: text("completion").notNull(),
  documentId: integer("document_id").references(() => documentsTable.id, {onDelete: 'cascade'}),
  analysisPercent: integer("analysis_percent").notNull().default(0),
  isComplete: boolean("is_complete").notNull().default(false),
  temperature: decimal('temperature', { precision: 2, scale: 1}).notNull(),//Two total digits, one after the decimal place
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Parsing  = typeof parsings.$inferSelect;
export type NewParsing = typeof parsings.$inferInsert;
