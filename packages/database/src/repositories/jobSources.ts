// packages/database/src/repositories/jobSources.ts
import { db } from "../db-connection";
import { eq, and, lt, desc, isNull, not } from "drizzle-orm";
import { jobSources, type JobSourceRecord, type NewJobSourceRecord } from "../schema/jobSources";

export class JobSourceRepository {
  async insert(data: NewJobSourceRecord): Promise<JobSourceRecord> {
    const [record] = await db.insert(jobSources).values(data).returning();
    return record;
  }

  async getById(id: number): Promise<JobSourceRecord | undefined> {
    const results = await db.select().from(jobSources).where(eq(jobSources.id, id));
    return results[0];
  }

  async getByUserId(userId: string): Promise<JobSourceRecord[]> {
    return await db.select().from(jobSources)
      .where(eq(jobSources.userId, userId))
      .orderBy(desc(jobSources.createdAt));
  }

  async getByGlobalCacheId(globalCacheId: number): Promise<JobSourceRecord[]> {
    return await db.select().from(jobSources)
      .where(eq(jobSources.globalCacheId, globalCacheId))
      .orderBy(desc(jobSources.lastScraped));
  }

  async getSourcesForScheduledRefresh(frequency: string): Promise<JobSourceRecord[]> {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);
    
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    // Handle frequency-based filter
    let timeFilter;
    if (frequency === "DAILY") {
      timeFilter = lt(jobSources.lastScraped, oneDayAgo);
    } else if (frequency === "WEEKLY") {
      timeFilter = lt(jobSources.lastScraped, oneWeekAgo);
    } else {
      // For MANUAL frequency, we will only include sources that have never been scraped
      timeFilter = isNull(jobSources.lastScraped);
    }
    
    return await db.select().from(jobSources)
      .where(and(
        eq(jobSources.refreshFrequency, frequency),
        eq(jobSources.status, "ACTIVE"),
        not(eq(jobSources.status, "PENDING")),
        timeFilter
      ))
      .orderBy(jobSources.lastScraped);
  }

  async update(id: number, data: Partial<JobSourceRecord>): Promise<JobSourceRecord[]> {
    return await db.update(jobSources)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(jobSources.id, id))
      .returning();
  }

  async updateStatus(id: number, status: string, errorMessage?: string): Promise<JobSourceRecord[]> {
    return await this.update(id, {
      status: status as any,
      errorMessage,
      updatedAt: new Date()
    });
  }

  async linkToGlobalCache(id: number, globalCacheId: number, usedCache: boolean = true): Promise<JobSourceRecord[]> {
    return await this.update(id, {
      globalCacheId,
      usedCache,
      usedCacheForLastUpdate: usedCache,
      updatedAt: new Date()
    });
  }

  async delete(id: number): Promise<void> {
    await db.delete(jobSources).where(eq(jobSources.id, id));
  }
}

