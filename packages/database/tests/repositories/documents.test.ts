import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DocumentRepository } from '../../src/repositories/documents';
import { db } from '../../src/db-connection';
import { documents, DocumentRecord } from '../../src/schema/documents';
import { DocumentType } from '@fedjobs/types';

describe('DocumentRepository', () => {
  const repo = new DocumentRepository();
  let insertedDocumentId: number;

  // Clean up the documents table before and after tests.
  beforeAll(async () => {
    await db.delete(documents).execute();
  });

  afterAll(async () => {
    await db.delete(documents).execute();
  });

  it('should insert a new document', async () => {
    const docData: DocumentRecord = {
      userId: 'test-user',
      type: "resume",  // Cast to DocumentType
      source: "USER_UPLOADED", // Should match your schema (or cast if needed)
      url: 'http://example.com/doc.pdf',
      s3Key: 'doc.pdf',
      content: 'Sample content',
      isParsed: false,
      inKnowledgeBank: false,
      data: {},
      name: 'Test Document',
      description: 'A test document',
    };

    const inserted = await repo.insert(docData);
    expect(inserted.id).toBeDefined();
    insertedDocumentId = inserted.id;
  });

  it('should retrieve a document by id with userId filter', async () => {
    const doc = await repo.getById(insertedDocumentId, 'test-user');
    expect(doc).toBeDefined();
    expect(doc?.id).toBe(insertedDocumentId);
  });

  it('should update a document', async () => {
    const updateData = { description: 'Updated description' };
    const updatedDocs = await repo.update(insertedDocumentId, updateData);
    expect(updatedDocs).toBeInstanceOf(Array);
    expect(updatedDocs[0].description).toBe('Updated description');
  });

  it('should get documents by userId', async () => {
    const docs = await repo.getByUserId('test-user');
    expect(docs.length).toBeGreaterThan(0);
  });

  it('should delete a document', async () => {
    await repo.delete(insertedDocumentId);
    const doc = await repo.getById(insertedDocumentId, 'test-user');
    expect(doc).toBeUndefined();
  });

  // Optional: test the prepared query functionality.
  it('should execute a prepared query to get documents by userId', async () => {
    // Insert a document first.
    const docData: Document = {
      userId: 'prepared-test',
      type: "resume",
      source: "USER_UPLOADED",
      url: 'http://example.com/prep.pdf',
      s3Key: 'prep.pdf',
      content: 'Prepared test content',
      isParsed: false,
      inKnowledgeBank: false,
      data: {},
      name: 'Prepared Document',
      description: 'Testing prepared queries',
    };
    const inserted = await repo.insert(docData);
    const results = await repo.executePreparedDocsByUserId('prepared-test');
    expect(results.length).toBeGreaterThan(0);
    // Clean up
    await repo.delete(inserted.id);
  });
});