// @fedjobs/database/src/queries/parsingQueries.ts

import { parsings, NewParsing } from '../schema/parsings';
import { db } from '../db-connection';

/**
 * Inserts a new parsing record into the parsings table.
 * @param newParsing - The new parsing data.
 * @returns The inserted parsing record.
 */
export async function insertParsing(newParsing: NewParsing): Promise<typeof parsings.$inferSelect> {
  const [parsing] = await db
    .insert(parsings)
    .values(newParsing)
    .returning();
  
  return parsing;
}