// packages/database/tests/repositories/parsings.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ParsingRepository } from '../../src/repositories/parsings';
import { db } from '../../src/db-connection';
import { parsings, ParsingRecord } from '../../src/schema/parsings';

describe('ParsingRepository', () => {
  const repo = new ParsingRepository();
  let insertedParsingId: number;

  beforeAll(async () => {
    await db.delete(parsings).execute();
  });

  afterAll(async () => {
    await db.delete(parsings).execute();
  });

  it('should insert a new parsing record', async () => {
    const parsingData: Omit<ParsingRecord, 'id' | 'createdAt'> = {
      userId: 'test-user',
      type: 'resume',
      prompt: 'Test prompt',
      completion: '',
      documentId: 1,
      analysisPercent: 0,
      isComplete: false,
      temperature: "0",
    };

    const inserted = await repo.insert(parsingData);
    expect(inserted.id).toBeDefined();
    insertedParsingId = inserted.id;
  });

  it('should update the progress of a parsing record', async () => {
    await repo.updateProgress(insertedParsingId, 50);
    const record = await repo.getById(insertedParsingId);
    expect(record?.analysisPercent).toBe(50);
  });

  it('should mark a parsing record as error', async () => {
    await repo.markAsError(insertedParsingId);
    const record = await repo.getById(insertedParsingId);
    expect(record?.completion).toBe("Error");
    expect(record?.isComplete).toBe(true);
  });

  it('should finalize a parsing record', async () => {
    // Re-insert a record to test finalization.
    const parsingData: Omit<ParsingRecord, 'id' | 'createdAt'> = {
      userId: 'test-user',
      type: 'resume',
      prompt: 'Another test prompt',
      completion: '',
      documentId: 2,
      analysisPercent: 0,
      isComplete: false,
      temperature: "0",
    };
    const inserted = await repo.insert(parsingData);
    await repo.finalize(inserted.id, '<xml>Completed</xml>');
    const record = await repo.getById(inserted.id);
    expect(record?.completion).toBe('<xml>Completed</xml>');
    expect(record?.analysisPercent).toBe(100);
    expect(record?.isComplete).toBe(true);
  });
});