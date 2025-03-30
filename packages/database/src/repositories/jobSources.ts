// packages/database/src/repositories/jobSources.ts
import { db } from '../db-connection';
import { eq, and, lt, desc } from 'drizzle-orm';
import { jobSources, type JobSourceRecord, type NewJobSourceRecord } from '../schema/jobSources';

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
  
  async getSourcesForScheduledRefresh(refreshFrequency: string): Promise<JobSourceRecord[]> {
    const now = new Date();
    let timeCutoff: Date;
    
    // Set cutoff time based on refresh frequency
    switch (refreshFrequency) {
      case 'DAILY':
        timeCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        break;
      case 'WEEKLY':
        timeCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        break;
      default:
        timeCutoff = new Date(now.getTime());
    }
    
    return await db.select().from(jobSources)
      .where(and(
        eq(jobSources.status, 'ACTIVE'),
        eq(jobSources.refreshFrequency, refreshFrequency),
        lt(jobSources.lastScraped, timeCutoff)
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

  async updateLastScraped(id: number): Promise<JobSourceRecord[]> {
    return await this.update(id, { 
      lastScraped: new Date(),
      updatedAt: new Date()
    });
  }

  async delete(id: number): Promise<void> {
    await db.delete(jobSources).where(eq(jobSources.id, id));
  }
}