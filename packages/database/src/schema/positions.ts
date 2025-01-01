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
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    organization: text("organization").notNull(),
    title: text("title").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    present: boolean("present").notNull(),
    activities: json("activities").notNull().$type<string[]>(), // Explicitly typed as string array
    accomplishments: json("accomplishments").notNull().$type<string[]>(), // Explicitly typed as string array
    isApproved: boolean("is_approved").notNull().default(false), // Approval flag
    groupId: text("group_id"), // New field for grouping
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  });
  
  export type Position = typeof positions.$inferSelect;
  export type NewPosition = typeof positions.$inferInsert;
  