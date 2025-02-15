// packages/database/tests/repositories/generations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenerationRepository } from '../../src/repositories/generations';
import { db } from '../../src/db-connection';
import { generations, GenerationRecord } from '../../src/schema/generations';

describe('GenerationRepository', () => {
  const repo = new GenerationRepository();
  let insertedGenerationId: number;

  beforeAll(async () => {
    await db.delete(generations).execute();
  });

  afterAll(async () => {
    await db.delete(generations).execute();
  });

  it('should insert a new generation record', async () => {
    const generationData: Omit<GenerationRecord, 'id' | 'createdAt'> = {
      userId: 'test-user',
      type: 'resume',
      isParagraph: false,
      prompt: 'Test prompt',
      completion: 'Test completion',
      temperature: '0.0',
    };

    const inserted = await repo.insert(generationData);
    expect(inserted.id).toBeDefined();
    insertedGenerationId = inserted.id;
  });

  it('should update a generation record', async () => {
    const updated = await repo.update(insertedGenerationId, { completion: 'Updated completion' });
    expect(updated[0].completion).toBe('Updated completion');
  });

  it('should retrieve a generation record by id', async () => {
    const record = await repo.getById(insertedGenerationId);
    expect(record).toBeDefined();
    expect(record?.id).toBe(insertedGenerationId);
  });

  it('should delete a generation record', async () => {
    await repo.delete(insertedGenerationId);
    const record = await repo.getById(insertedGenerationId);
    expect(record).toBeUndefined();
  });

  it('should get generation records by user id', async () => {
    // Insert a record first.
    await repo.insert({
      userId: 'test-user',
      type: 'resume',
      isParagraph: false,
      prompt: 'Another prompt',
      completion: 'Another completion',
      temperature: '0.0',
    });
    const records = await repo.getByUserId('test-user');
    expect(records.length).toBeGreaterThan(0);
  });
});