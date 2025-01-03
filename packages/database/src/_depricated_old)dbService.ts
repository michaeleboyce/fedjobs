// File path: packages/database/src/_depricated_old)dbService.ts
// dbService.ts
import { db } from './db-connection';
import { eq, and } from 'drizzle-orm'
import { documents as documentsTable, DocumentRecord, NewDocumentRecord } from './schema/documents';
import { parsings as parsingsTable } from './schema/parsings';

export const insertDocument = async (documentData: NewDocumentRecord): Promise<DocumentRecord> => {
  const result = await db.insert(documentsTable).values(documentData).returning();
  return result[0];
};

export const updateDocument = async (documentId: number, updateData: Partial<DocumentRecord>): Promise<DocumentRecord[]> => {
  return await db.update(documentsTable).set(updateData).where(eq(documentsTable.id, documentId)).returning();
};

export const getParsingsByDocId = async (documentId: number) => {
  return await db.select().from(parsingsTable).where(eq(parsingsTable.documentId, documentId)).execute();
};

export const getDocumentById = async (documentId: number, userId: string): Promise<DocumentRecord[]> => {
  return await db.select().from(documentsTable).where(and(eq(documentsTable.id, documentId), eq(documentsTable.userId, userId))).execute();
};

export const deleteDocumentRecord = async (documentId: number): Promise<void> => {
  await db.delete(documentsTable).where(eq(documentsTable.id, documentId)).execute();
};