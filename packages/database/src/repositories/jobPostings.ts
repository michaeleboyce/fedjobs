// packages/database/src/repositories/jobPostings.ts
import { db } from "../db-connection";
import { eq, and, like, desc, sql, not, or, inArray } from "drizzle-orm";
import {
  jobPostings,
  type JobPostingRecord,
  type NewJobPostingRecord,
} from "../schema/jobPostings";
import { jobSources } from "../schema/jobSources";
import { userJobFeedback } from "../schema/userJobFeedback";

export class JobPostingRepository {
  async insert(data: NewJobPostingRecord): Promise<JobPostingRecord> {
    const [record] = (await db
      .insert(jobPostings)
      .values(data)
      .returning()) as unknown as JobPostingRecord[];
    return record;
  }

  async bulkInsert(dataArray: NewJobPostingRecord[]): Promise<JobPostingRecord[]> {
    return (await db
      .insert(jobPostings)
      .values(dataArray)
      .returning()) as unknown as JobPostingRecord[];
  }

  async getById(id: number): Promise<JobPostingRecord | undefined> {
    const results = (await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.id, id))) as unknown as JobPostingRecord[];
    return results[0];
  }

  async getBySourceId(sourceId: number): Promise<JobPostingRecord[]> {
    return (await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.sourceId, sourceId))
      .orderBy(desc(jobPostings.datePosted))) as unknown as JobPostingRecord[];
  }

  async getFeaturedJobs(limit: number = 5): Promise<JobPostingRecord[]> {
    return (await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.isActive, true))
      .orderBy(desc(jobPostings.datePosted))
      .limit(limit)) as unknown as JobPostingRecord[];
  }

  async searchJobs(params: {
    keywords?: string;
    location?: string;
    organization?: string;
    organizationType?: string;
    employmentType?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<JobPostingRecord[]> {
    const filters = [];

    if (params.keywords) {
      const keywordTerms = params.keywords.split(" ").filter(Boolean);
      if (keywordTerms.length > 0) {
        const keywordFilters = keywordTerms.map(term => {
          const pattern = `%${term}%`;
          return or(
            like(jobPostings.title, pattern),
            like(jobPostings.description, pattern),
            like(jobPostings.requirements, pattern)
          );
        });
        filters.push(and(...keywordFilters));
      }
    }

    if (params.location) {
      filters.push(like(jobPostings.location, `%${params.location}%`));
    }

    if (params.organization) {
      filters.push(like(jobPostings.organization, `%${params.organization}%`));
    }

    if (params.organizationType) {
      filters.push(eq(jobPostings.organizationType, params.organizationType as any));
    }

    if (params.employmentType) {
      filters.push(eq(jobPostings.type, params.employmentType as any));
    }

    // Always add active filter
    filters.push(eq(jobPostings.isActive, true));

    const allConditions = filters.length > 0 ? and(...filters) : undefined;

    // Build the final query in one chain without reassigning.
    let query;

    if (params.limit && params.offset){
      query = db
      .select()
      .from(jobPostings)
      .where(allConditions ?? undefined)
      .orderBy(desc(jobPostings.datePosted))
      .limit(params.limit)
      .offset(params.offset);
    } else if (params.limit){
      query = db
      .select()
      .from(jobPostings)
      .where(allConditions ?? undefined)
      .orderBy(desc(jobPostings.datePosted))
      .limit(params.limit);
    } else if (params.offset){
      query = db
      .select()
      .from(jobPostings)
      .where(allConditions ?? undefined)
      .orderBy(desc(jobPostings.datePosted))
      .limit(params.offset);
    }
    else {
      query = db
      .select()
      .from(jobPostings)
      .where(allConditions ?? undefined)
      .orderBy(desc(jobPostings.datePosted));
    }

    return (await query) as unknown as JobPostingRecord[];
  }

  async countJobs(params: {
    keywords?: string;
    location?: string;
    organization?: string;
    organizationType?: string;
    employmentType?: string;
    userId?: string;
  }): Promise<number> {
    const filters = [];

    if (params.keywords) {
      const keywordTerms = params.keywords.split(" ").filter(Boolean);
      if (keywordTerms.length > 0) {
        const keywordFilters = keywordTerms.map(term => {
          const pattern = `%${term}%`;
          return or(
            like(jobPostings.title, pattern),
            like(jobPostings.description, pattern),
            like(jobPostings.requirements, pattern)
          );
        });
        filters.push(and(...keywordFilters));
      }
    }

    if (params.location) {
      filters.push(like(jobPostings.location, `%${params.location}%`));
    }

    if (params.organization) {
      filters.push(like(jobPostings.organization, `%${params.organization}%`));
    }

    if (params.organizationType) {
      filters.push(eq(jobPostings.organizationType, params.organizationType as any));
    }

    if (params.employmentType) {
      filters.push(eq(jobPostings.type, params.employmentType as any));
    }

    // Always add active filter
    filters.push(eq(jobPostings.isActive, true));

    const allConditions = filters.length > 0 ? and(...filters) : undefined;

    const result = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(jobPostings)
      .where(allConditions ?? undefined);

    return result[0]?.count || 0;
  }

  async update(id: number, data: Partial<JobPostingRecord>): Promise<JobPostingRecord[]> {
    return (await db
      .update(jobPostings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.id, id))
      .returning()) as unknown as JobPostingRecord[];
  }

  async deactivateBySourceId(sourceId: number): Promise<void> {
    await db
      .update(jobPostings)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(jobPostings.sourceId, sourceId));
  }

  async getJobCountsBySourceIds(sourceIds: number[]): Promise<Record<number, number>> {
    const result = (await db
      .select({
        sourceId: jobPostings.sourceId,
        count: sql<number>`count(*)`,
      })
      .from(jobPostings)
      .where(
        and(
          inArray(jobPostings.sourceId, sourceIds),
          eq(jobPostings.isActive, true)
        )
      )
      .groupBy(jobPostings.sourceId)) as unknown as { sourceId: number; count: number }[];

    const counts: Record<number, number> = {};
    for (const row of result) {
      counts[row.sourceId] = Number(row.count);
    }
    for (const sourceId of sourceIds) {
      if (counts[sourceId] === undefined) {
        counts[sourceId] = 0;
      }
    }
    return counts;
  }

  async getInterestedJobsByUser(userId: string): Promise<JobPostingRecord[]> {
    const interestedFeedback = (await db
      .select()
      .from(userJobFeedback)
      .where(
        and(
          eq(userJobFeedback.userId, userId),
          eq(userJobFeedback.feedbackType, "INTERESTED")
        )
      )) as unknown as { jobId: number }[];

    if (interestedFeedback.length === 0) {
      return [];
    }

    const jobIds = interestedFeedback.map(fb => fb.jobId);

    return (await db
      .select()
      .from(jobPostings)
      .where(inArray(jobPostings.id, jobIds))
      .orderBy(desc(jobPostings.datePosted))) as unknown as JobPostingRecord[];
  }

  async getSimilarJobs(jobId: number, limit: number = 5): Promise<JobPostingRecord[]> {
    // Get the job we want similar jobs for
    const targetJobs = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId));

    if (targetJobs.length === 0) {
      return [];
    }

    const job = targetJobs[0];
    
    // Extract meaningful words from the title for matching
    const titleWords = job.title
      .split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => `%${word}%`);
    const titleFilters = titleWords.map(word => like(jobPostings.title, word));

    const query = db
      .select()
      .from(jobPostings)
      .where(
        and(
          not(eq(jobPostings.id, jobId)),
          eq(jobPostings.isActive, true),
          or(...titleFilters)
        )
      )
      .orderBy(desc(jobPostings.datePosted))
      .limit(limit);

    return (await query) as unknown as JobPostingRecord[];
  }
  
  async getRecommendedJobs(userId: string, options: {
    limit?: number;
    excludeIds?: number[];
  } = {}): Promise<JobPostingRecord[]> {
    const { limit = 10, excludeIds = [] } = options;
    
    // Build filter conditions
    const filterConditions = [
      eq(jobPostings.isActive, true) // Only active jobs
    ];
    
    // Exclude specific job IDs if provided
    if (excludeIds.length > 0) {
      filterConditions.push(not(inArray(jobPostings.id, excludeIds)));
    }
    
    // For now, just get recent jobs - in the future, this could use more sophisticated recommendation logic
    const jobs = await db
      .select()
      .from(jobPostings)
      .where(and(...filterConditions))
      .orderBy(desc(jobPostings.datePosted))
      .limit(limit);
    
    return jobs as unknown as JobPostingRecord[];
  }
}
