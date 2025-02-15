// packages/database/tests/repositories/positions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PositionRepository } from '../../src/repositories/positions';
import { db } from '../../src/db-connection';
import { positions } from '../../src/schema/positions';

describe('PositionRepository', () => {
  const repo = new PositionRepository();
  const testUuid = 'test-uuid-1234';

  beforeAll(async () => {
    await db.delete(positions).execute();
  });

  afterAll(async () => {
    await db.delete(positions).execute();
  });

  it('should insert a new position record', async () => {
    const positionData = {
      positionUuid: testUuid, // normally use a generated uuid
      userId: 'test-user',
      documentId: 1,
      organization: 'Test Org',
      title: 'Test Title',
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      present: false,
      activities: ['activity1'],
      accomplishments: ['accomplishment1'],
      isEmploymentHistory: false,
      originalPositionUuid: null,
      originalDocumentId: null,
      similarPositionUuids: [],
      approvedSimilarPositionUuids: [],
      rejectedSimilarPositionUuids: [],
    };

    const inserted = await repo.insert(positionData);
    expect(inserted.positionUuid).toBe(testUuid);
  });

  it('should retrieve a position by UUID', async () => {
    const position = await repo.getByUuid(testUuid);
    expect(position).toBeDefined();
    expect(position?.positionUuid).toBe(testUuid);
  });

  it('should update a position by UUID', async () => {
    const updated = await repo.updateByUuid(testUuid, { title: 'Updated Title' });
    expect(updated[0].title).toBe('Updated Title');
  });

  it('should delete a position by UUID', async () => {
    await repo.deleteByUuid(testUuid);
    const position = await repo.getByUuid(testUuid);
    expect(position).toBeUndefined();
  });
});