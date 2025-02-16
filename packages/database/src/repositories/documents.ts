// File path: packages/database/src/repositories/documents.ts
// packages/database/src/repositories/documents.ts
import { db } from '../db-connection';
import { eq, and, sql } from 'drizzle-orm';
import { documents, type DocumentRecord, type NewDocumentRecord } from '../schema/documents';

export class DocumentRepository {
  // Inserts a new document record.
  async insert(documentData: NewDocumentRecord): Promise<DocumentRecord> {
    const [doc] = await db.insert(documents).values(documentData).returning();
    return doc;
  }

  // Updates a document record by ID.
  async update(documentId: number, updateData: Partial<DocumentRecord>): Promise<DocumentRecord[]> {
    return await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, documentId))
      .returning();
  }

  // Retrieves a document by its ID, optionally enforcing a userId check.
  async getById(documentId: number, userId?: string): Promise<DocumentRecord | undefined> {
    const condition = userId
      ? and(eq(documents.id, documentId), eq(documents.userId, userId))
      : eq(documents.id, documentId);
    const results = await db.select().from(documents).where(condition).execute();
    return results.length ? results[0] : undefined;
  }

  // Deletes a document record by ID.
  async delete(documentId: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, documentId)).execute();
  }

  // Retrieves all documents for a given user.
  async getByUserId(userId: string): Promise<DocumentRecord[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).execute();
  }

  // Optionally, include prepared query functionality:
  private preparedDocsByUserId = db
    .select()
    .from(documents)
    .where(eq(documents.userId, sql.placeholder('id')))
    .prepare('get_docs_by_user_id');

  async executePreparedDocsByUserId(id: string): Promise<DocumentRecord[]> {
    return await this.preparedDocsByUserId.execute({ id });
  }
}