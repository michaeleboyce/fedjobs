// File path: packages/database/src/repositories/userJobFeedback.ts
// packages/database/src/repositories/userJobFeedback.ts
import { db } from '../db-connection';
import { eq, and } from 'drizzle-orm';
import { userJobFeedback, type UserJobFeedbackRecord, type NewUserJobFeedbackRecord } from '../schema/userJobFeedback';
import { jobPostings } from '../schema/jobPostings';

export class UserJobFeedbackRepository {
  async insert(data: NewUserJobFeedbackRecord): Promise<UserJobFeedbackRecord> {
    const [record] = await db.insert(userJobFeedback).values(data).returning();
    return record;
  }

  async getByUserIdAndJobId(userId: string, jobId: number): Promise<UserJobFeedbackRecord | undefined> {
    const results = await db.select()
      .from(userJobFeedback)
      .where(and(
        eq(userJobFeedback.userId, userId),
        eq(userJobFeedback.jobId, jobId)
      ));
    return results[0];
  }

  async getFeedbackByUserId(userId: string): Promise<UserJobFeedbackRecord[]> {
    return await db.select()
      .from(userJobFeedback)
      .where(eq(userJobFeedback.userId, userId));
  }

  async getFeedbackWithJobDetails(userId: string, feedbackType?: string): Promise<(UserJobFeedbackRecord & { job: typeof jobPostings.$inferSelect })[]> {
    let baseConditions = [eq(userJobFeedback.userId, userId)];
    
    if (feedbackType) {
      baseConditions.push(eq(userJobFeedback.feedbackType, feedbackType as any));
    }
    
    // Create the query with all conditions
    const results = await db.select({
      // Explicit fields from userJobFeedback
      id: userJobFeedback.id,
      userId: userJobFeedback.userId,
      jobId: userJobFeedback.jobId,
      feedbackType: userJobFeedback.feedbackType,
      reasons: userJobFeedback.reasons,
      viewed: userJobFeedback.viewed,
      createdAt: userJobFeedback.createdAt,
      updatedAt: userJobFeedback.updatedAt,
      // Explicit fields from jobPostings
      job: {
        id: jobPostings.id,
        sourceId: jobPostings.sourceId,
        externalId: jobPostings.externalId,
        title: jobPostings.title,
        organization: jobPostings.organization,
        organizationType: jobPostings.organizationType,
        department: jobPostings.department,
        location: jobPostings.location,
        description: jobPostings.description,
        salary: jobPostings.salary,
        requirements: jobPostings.requirements,
        url: jobPostings.url,
        type: jobPostings.type,
        experience: jobPostings.experience,
        isActive: jobPostings.isActive,
        status: jobPostings.status,
        datePosted: jobPostings.datePosted,
        dateScraped: jobPostings.dateScraped,
        structuredData: jobPostings.structuredData,
        benefits: jobPostings.benefits,
        skills: jobPostings.skills,
        createdAt: jobPostings.createdAt,
        updatedAt: jobPostings.updatedAt
      }
    })
    .from(userJobFeedback)
    .leftJoin(jobPostings, eq(userJobFeedback.jobId, jobPostings.id))
    .where(and(...baseConditions));
    
    // Cast the results to the expected type
    return results as (UserJobFeedbackRecord & { job: typeof jobPostings.$inferSelect })[];
  }

  async update(id: number, data: Partial<UserJobFeedbackRecord>): Promise<UserJobFeedbackRecord[]> {
    return await db.update(userJobFeedback)
      .set(data)
      .where(eq(userJobFeedback.id, id))
      .returning();
  }

  async updateOrCreate(userId: string, jobId: number, data: Omit<NewUserJobFeedbackRecord, 'userId' | 'jobId'>): Promise<UserJobFeedbackRecord> {
    const existing = await this.getByUserIdAndJobId(userId, jobId);
    
    if (existing) {
      const [updated] = await this.update(existing.id, data);
      return updated;
    } else {
      return await this.insert({
        userId,
        jobId,
        ...data
      });
    }
  }

  async delete(id: number): Promise<void> {
    await db.delete(userJobFeedback).where(eq(userJobFeedback.id, id));
  }
}