// File path: packages/database/src/queries/parsingQueries.ts
// packages/database/src/queries/parsingQueries.ts

import { db } from '../db-connection';
import { eq, desc } from 'drizzle-orm';
import { parsings, type ParsingRecord, type NewParsingRecord } from '../schema/parsings';

/**
 * Retrieves all parsings for a given documentId.
 */
export async function getParsingsByDocId(documentId: number): Promise<ParsingRecord[]> {
  return db
    .select()
    .from(parsings)
    .where(eq(parsings.documentId, documentId))
    .execute();
}

/**
 * Inserts a new parsing record into the parsings table.
 */
export async function insertParsing(newParsing: NewParsingRecord): Promise<ParsingRecord> {
  const [parsing] = await db
    .insert(parsings)
    .values(newParsing)
    .returning();
  return parsing;
}

/**
 * Retrieves the latest parsing for a given document ID (sorted by createdAt desc).
 */
export async function getLatestParsingByDocId(documentId: number): Promise<ParsingRecord | null> {
  const parsingTasks = await db
    .select()
    .from(parsings)
    .where(eq(parsings.documentId, documentId))
    .orderBy(desc(parsings.createdAt))
    .limit(1)
    .execute();

  return parsingTasks.length ? parsingTasks[0] : null;
}

/**
 * Updates the progress (analysisPercent) of a parsing record.
 */
export async function updateParsingProgress(parsingId: number, progress: number): Promise<void> {
  await db
    .update(parsings)
    .set({ analysisPercent: progress })
    .where(eq(parsings.id, parsingId))
    .execute();
}

/**
 * Marks a parsing record as error (when XML->JSON parsing fails).
 */
export async function markParsingAsError(parsingId: number): Promise<void> {
  await db
    .update(parsings)
    .set({ completion: "Error", isComplete: true })
    .where(eq(parsings.id, parsingId))
    .execute();
}

/**
 * Completes a parsing record with final XML or text (finish the parse).
 */
export async function finalizeParsing(
  parsingId: number, 
  annotatedXML: string
): Promise<void> {
  await db
    .update(parsings)
    .set({
      completion: annotatedXML,
      analysisPercent: 100,
      isComplete: true,
    })
    .where(eq(parsings.id, parsingId))
    .execute();
}

/**
 * Retrieves a single parsing record by primary key ID.
 */
export async function getParsingById(parsingId: number): Promise<ParsingRecord | null> {
  const [p] = await db
    .select()
    .from(parsings)
    .where(eq(parsings.id, parsingId))
    .execute();
  return p ?? null;
}
