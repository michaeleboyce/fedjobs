// File path: packages/database/src/repositories/globalSourceCache.ts

import { db } from '../db-connection';
import { eq, and, lt, desc, gt, or, sql } from 'drizzle-orm';
import { 
  globalSourceCache, 
  type GlobalSourceCacheRecord, 
  type NewGlobalSourceCacheRecord 
} from '../schema/globalSourceCache';

/**
 * Repository for managing global source cache entries
 */
export class GlobalSourceCacheRepository {
  /**
   * Insert a new global source cache entry
   */
  async insert(data: NewGlobalSourceCacheRecord): Promise<GlobalSourceCacheRecord> {
    const [record] = await db.insert(globalSourceCache).values(data).returning();
    return record;
  }

  /**
   * Get a global source cache entry by ID
   */
  async getById(id: number): Promise<GlobalSourceCacheRecord | undefined> {
    const results = await db.select().from(globalSourceCache).where(eq(globalSourceCache.id, id));
    return results[0];
  }

  /**
   * Get a global source cache entry by normalized URL
   */
  async getByNormalizedUrl(normalizedUrl: string): Promise<GlobalSourceCacheRecord | undefined> {
    const results = await db.select().from(globalSourceCache)
      .where(eq(globalSourceCache.normalizedUrl, normalizedUrl));
    return results[0];
  }

  /**
   * Get all global source cache entries that are fresh (not expired)
   */
  async getFreshCacheEntries(): Promise<GlobalSourceCacheRecord[]> {
    const now = new Date();
    return await db.select().from(globalSourceCache)
      .where(and(
        eq(globalSourceCache.status, 'ACTIVE'),
        gt(globalSourceCache.expiresAt, now)
      ))
      .orderBy(desc(globalSourceCache.lastCrawled));
  }

  /**
   * Get all global source cache entries that need refreshing
   */
  async getExpiredCacheEntries(): Promise<GlobalSourceCacheRecord[]> {
    const now = new Date();
    return await db.select().from(globalSourceCache)
      .where(and(
        or(
          eq(globalSourceCache.status, 'ACTIVE'),
          eq(globalSourceCache.status, 'STALE')
        ),
        lt(globalSourceCache.expiresAt, now)
      ))
      .orderBy(globalSourceCache.expiresAt);
  }

  /**
   * Update a global source cache entry
   */
  async update(id: number, data: Partial<GlobalSourceCacheRecord>): Promise<GlobalSourceCacheRecord[]> {
    return await db.update(globalSourceCache)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(globalSourceCache.id, id))
      .returning();
  }

  /**
   * Update the status of a global source cache entry
   */
  async updateStatus(id: number, status: string, errorMessage?: string): Promise<GlobalSourceCacheRecord[]> {
    return await this.update(id, { 
      status: status as any,
      errorMessage,
      updatedAt: new Date()
    });
  }

  /**
   * Mark a global source cache entry as refreshed
   */
  async markRefreshed(id: number, jobCount: number, expiryDays: number = 1): Promise<GlobalSourceCacheRecord[]> {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + expiryDays);
    
    return await this.update(id, { 
      lastCrawled: now,
      expiresAt,
      status: 'ACTIVE',
      jobCount,
      errorMessage: null
    });
  }

  /**
   * Increment the user count for a global source cache entry
   */
  async incrementUserCount(id: number): Promise<GlobalSourceCacheRecord[]> {
    return await db.update(globalSourceCache)
      .set({
        userCount: sql`${globalSourceCache.userCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(globalSourceCache.id, id))
      .returning();
  }

  /**
   * Decrement the user count for a global source cache entry
   */
  async decrementUserCount(id: number): Promise<GlobalSourceCacheRecord[]> {
    return await db.update(globalSourceCache)
      .set({
        userCount: sql`GREATEST(${globalSourceCache.userCount} - 1, 0)`,
        updatedAt: new Date()
      })
      .where(eq(globalSourceCache.id, id))
      .returning();
  }

  /**
   * Delete a global source cache entry
   */
  async delete(id: number): Promise<void> {
    await db.delete(globalSourceCache).where(eq(globalSourceCache.id, id));
  }
}