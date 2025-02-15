// packages/database/src/repositories/generations.ts
import { db } from '../db-connection';
import { eq } from 'drizzle-orm';
import { generations, type GenerationRecord, type NewGenerationRecord } from '../schema/generations';

export class GenerationRepository {
  // Inserts a new generation record.
  async insert(newGeneration: NewGenerationRecord): Promise<GenerationRecord> {
    const [generation] = await db.insert(generations).values(newGeneration).returning();
    return generation;
  }

  // Updates a generation record by ID.
  async update(generationId: number, updateData: Partial<GenerationRecord>): Promise<GenerationRecord[]> {
    return await db
      .update(generations)
      .set(updateData)
      .where(eq(generations.id, generationId))
      .returning();
  }

  // Retrieves a generation record by its ID.
  async getById(generationId: number): Promise<GenerationRecord | undefined> {
    const results = await db.select().from(generations).where(eq(generations.id, generationId)).execute();
    return results.length ? results[0] : undefined;
  }

  // Deletes a generation record by its ID.
  async delete(generationId: number): Promise<void> {
    await db.delete(generations).where(eq(generations.id, generationId)).execute();
  }

  // Retrieves all generation records for a given user.
  async getByUserId(userId: string): Promise<GenerationRecord[]> {
    return await db.select().from(generations).where(eq(generations.userId, userId)).execute();
  }
}