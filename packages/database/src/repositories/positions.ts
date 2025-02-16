// File path: packages/database/src/repositories/positions.ts
// packages/database/src/repositories/positions.ts
import { db } from '../db-connection';
import { eq } from 'drizzle-orm';
import { positions, type PositionRecord, type NewPositionRecord } from '../schema/positions';

export class PositionRepository {
  // Inserts a new position record.
  async insert(positionData: NewPositionRecord): Promise<PositionRecord> {
    const [position] = await db.insert(positions).values(positionData).returning();
    return position;
  }

  // Retrieves a position by its UUID.
  async getByUuid(positionUuid: string): Promise<PositionRecord | undefined> {
    const results = await db
      .select()
      .from(positions)
      .where(eq(positions.positionUuid, positionUuid))
      .execute();
    return results.length ? results[0] : undefined;
  }

  // Retrieves all positions for a given user.
  async getByUserId(userId: string): Promise<PositionRecord[]> {
    return await db
      .select()
      .from(positions)
      .where(eq(positions.userId, userId))
      .execute();
  }

  // Updates a position record by its UUID.
  async updateByUuid(positionUuid: string, updateData: Partial<PositionRecord>): Promise<PositionRecord[]> {
    return await db
      .update(positions)
      .set(updateData)
      .where(eq(positions.positionUuid, positionUuid))
      .returning();
  }

  // Deletes a position record by its UUID.
  async deleteByUuid(positionUuid: string): Promise<void> {
    await db.delete(positions).where(eq(positions.positionUuid, positionUuid)).execute();
  }

  // Updates specific fields of a position record.
  async updateFields(positionUuid: string, updateData: Partial<PositionRecord>): Promise<PositionRecord[]> {
    return await db
      .update(positions)
      .set(updateData)
      .where(eq(positions.positionUuid, positionUuid))
      .returning();
  }
}