// File path: packages/database/src/schema/positions.ts
import {
  serial,
  text,
  integer,
  boolean,
  json,
  varchar,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { documents } from "./documents";

export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  positionUuid: varchar("position_uuid", { length: 36 }).unique().notNull(), // UUID
  userId: text("user_id").notNull(),
  documentId: integer("document_id")
    .references(() => documents.id, { onDelete: "cascade" }),
  organization: text("organization").notNull(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  present: boolean("present").notNull(),
  activities: json("activities").notNull().$type<string[]>(), // Typed as string array
  accomplishments: json("accomplishments").notNull().$type<string[]>(), // Typed as string array
  isEmploymentHistory: boolean("is_employment_history").notNull().default(false), // Flag for employment history
  originalPositionUuid: varchar("original_position_uuid", { length: 36 }), // Reference to original position
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  
  // New fields for similarity tracking
  similarPositionUuids: json("similar_position_uuids").notNull().default('[]').$type<string[]>(),
  approvedSimilarPositionUuids: json("approved_similar_position_uuids").notNull().default('[]').$type<string[]>(),
  rejectedSimilarPositionUuids: json("rejected_similar_position_uuids").notNull().default('[]').$type<string[]>(),
});
