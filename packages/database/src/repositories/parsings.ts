// File path: packages/database/src/repositories/parsings.ts
// packages/database/src/repositories/parsings.ts
import { db } from '../db-connection';
import { eq, desc } from 'drizzle-orm';
import { parsings, type ParsingRecord, type NewParsingRecord } from '../schema/parsings';

export class ParsingRepository {
  // Inserts a new parsing record.
  async insert(newParsing: NewParsingRecord): Promise<ParsingRecord> {
    const [parsing] = await db.insert(parsings).values(newParsing).returning();
    return parsing;
  }

  // Retrieves all parsing records for a given document ID.
  async getParsingsByDocumentId(documentId: number): Promise<ParsingRecord[]> {
    return await db
      .select()
      .from(parsings)
      .where(eq(parsings.documentId, documentId))
      .execute();
  }

  // Retrieves the latest parsing record for a given document.
  async getLatestByDocumentId(documentId: number): Promise<ParsingRecord | null> {
    const records = await db
      .select()
      .from(parsings)
      .where(eq(parsings.documentId, documentId))
      .orderBy(desc(parsings.createdAt))
      .limit(1)
      .execute();
    return records.length ? records[0] : null;
  }

  // Updates the progress (analysisPercent) for a parsing record.
  async updateProgress(parsingId: number, progress: number): Promise<void> {
    await db
      .update(parsings)
      .set({ analysisPercent: progress })
      .where(eq(parsings.id, parsingId))
      .execute();
  }

  // Marks a parsing record as an error.
  async markAsError(parsingId: number): Promise<void> {
    await db
      .update(parsings)
      .set({ completion: "Error", isComplete: true })
      .where(eq(parsings.id, parsingId))
      .execute();
  }

  // Finalizes a parsing record with the completed XML.
  async finalize(parsingId: number, annotatedXML: string): Promise<void> {
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

  // Retrieves a parsing record by its primary key.
  async getById(parsingId: number): Promise<ParsingRecord | null> {
    const [record] = await db
      .select()
      .from(parsings)
      .where(eq(parsings.id, parsingId))
      .execute();
    return record ?? null;
  }
}