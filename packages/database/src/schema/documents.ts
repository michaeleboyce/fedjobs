// File path: packages/database/src/schema/documents.ts
import { serial, boolean, text, integer, json, varchar, pgTable, pgEnum, timestamp } from "drizzle-orm/pg-core"
import { DOCUMENT_TYPES } from '@fedjobs/types';

export const documentType = pgEnum("document_type", DOCUMENT_TYPES)
export const documentSource = pgEnum("document_source", ["USER_UPLOADED", "APPLICATION_GENERATED"]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: documentType("type").notNull(),
  source: documentSource("source").notNull().default("USER_UPLOADED"), 
  url: text("url").notNull(),
  s3Key: text("s3_key").notNull(),
  content: text("text").notNull(),
  isParsed: boolean("is_parsed").notNull().default(false),
  inKnowledgeBank: boolean("in_knowledge_bank").notNull().default(false),
  data: json("data").notNull().default({}),
  name: varchar("name", { length: 75 }).notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentRecord = typeof documents.$inferSelect;
export type NewDocumentRecord = typeof documents.$inferInsert;
