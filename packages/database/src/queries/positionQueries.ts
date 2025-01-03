// File path: packages/database/src/queries/positionQueries.ts
import { db } from "../db-connection";
import { eq } from "drizzle-orm";
import { positions, type PositionRecord, type NewPositionRecord } from "../schema/positions";

/**
 * Inserts a new position record.
 */
export async function insertPosition(positionData: NewPositionRecord): Promise<PositionRecord> {
  const [pos] = await db.insert(positions).values(positionData).returning();
  return pos;
}

/**
 * Retrieves a position by its UUID.
 */
export async function getPositionByUuid(positionUuid: string): Promise<PositionRecord | undefined> {
  const results = await db
    .select()
    .from(positions)
    .where(eq(positions.positionUuid, positionUuid))
    .execute();

  return results.length ? results[0] : undefined;
}

/**
 * Retrieves all positions for a given user.
 */
export async function getPositionsByUserId(userId: string): Promise<PositionRecord[]> {
  return db
    .select()
    .from(positions)
    .where(eq(positions.userId, userId))
    .execute();
}

/**
 * Retrieves all positions within a specific group.
 */
export async function getPositionsByGroupId(groupId: string): Promise<PositionRecord[]> {
  return db
    .select()
    .from(positions)
    .where(eq(positions.groupId, groupId))
    .execute();
}

/**
 * Updates a position by its UUID.
 */
export async function updatePositionByUuid(
  positionUuid: string,
  updateData: Partial<PositionRecord>
): Promise<PositionRecord[]> {
  return db
    .update(positions)
    .set(updateData)
    .where(eq(positions.positionUuid, positionUuid))
    .returning();
}

/**
 * Deletes a position by its UUID.
 */
export async function deletePositionByUuid(positionUuid: string): Promise<void> {
  await db
    .delete(positions)
    .where(eq(positions.positionUuid, positionUuid))
    .execute();
}
