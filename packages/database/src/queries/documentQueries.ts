// File path: packages/database/src/queries/documentQueries.ts
// packages/database/src/queries/documentQueries.ts

import { db } from '../db-connection';
import { eq, and } from 'drizzle-orm';
import { documents, type Document, type NewDocument } from '../schema/documents';

/**
 * Inserts a new document record.
 */
export async function insertDocument(documentData: NewDocument): Promise<Document> {
  const [doc] = await db
    .insert(documents)
    .values(documentData)
    .returning();
  return doc;
}

/**
 * Updates a document record by ID.
 * Returns an array of updated Document objects (Drizzle's returning).
 */
export async function updateDocument(
  documentId: number, 
  updateData: Partial<Document>
): Promise<Document[]> {
  return db
    .update(documents)
    .set(updateData)
    .where(eq(documents.id, documentId))
    .returning();
}

/**
 * Retrieves a document by ID + userId (if you want to enforce ownership).
 * Returns the single document or `undefined` if not found.
 */
export async function getDocumentById(
    documentId: number,
    userId?: string,
  ): Promise<Document | undefined> {
    const results = await db
      .select()                 // Start with db.select()
      .from(documents)         // Then from(documents)
      .where(eq(documents.id, documentId)) // Then where(...)
      .execute();              // Finally execute()
  
    return results.length ? results[0] : undefined;
  }

/**
 * Deletes a document record by ID.
 */
export async function deleteDocumentRecord(documentId: number): Promise<void> {
  await db
    .delete(documents)
    .where(eq(documents.id, documentId))
    .execute();
}

/**
 * (Optional) If you need a function to get all docs for a user:
 */
export async function getDocsByUserId(userId: string): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .execute();
}
