// packages/database/src/repositories/jobPostings.ts
import { db } from '../db-connection';
import { eq, and, like, desc, sql, not, or, inArray } from 'drizzle-orm';
import { jobPostings, type JobPostingRecord, type NewJobPostingRecord } from '../schema/jobPostings';
import { jobSources } from '../schema/jobSources';
import { userJobFeedback } from '../schema/userJobFeedback';

export class JobPostingRepository {
  async insert(data: NewJobPostingRecord): Promise<JobPostingRecord> {
    const [record] = await db.insert(jobPostings).values(data).returning();
    return record;
  }

  async bulkInsert(dataArray: NewJobPostingRecord[]): Promise<JobPostingRecord[]> {
    return await db.insert(jobPostings).values(dataArray).returning();
  }

  async getById(id: number): Promise<JobPostingRecord | undefined> {
    const results = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
    return results[0];
  }

  async getBySourceId(sourceId: number): Promise<JobPostingRecord[]> {
    return await db.select().from(jobPostings)
      .where(eq(jobPostings.sourceId, sourceId))
      .orderBy(desc(jobPostings.dateScraped));
  }

  async getByUserId(userId: string, params?: { limit?: number, active?: boolean }): Promise<JobPostingRecord[]> {
    const { limit = 100, active = true } = params || {};
    
    const results = await db.select({
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
      })
      .from(jobPostings)
      .innerJoin(jobSources, eq(jobPostings.sourceId, jobSources.id))
      .where(and(
        eq(jobSources.userId, userId),
        active ? eq(jobPostings.isActive, true) : undefined
      ))
      .orderBy(desc(jobPostings.dateScraped))
      .limit(limit);
      
    return results as JobPostingRecord[];
  }

  async searchJobs(
    searchParams: {
      keywords?: string;
      location?: string;
      organization?: string;
      organizationType?: string;
      employmentType?: string;
      userId?: string;
      excludeIds?: number[];
      limit?: number;
    }
  ): Promise<JobPostingRecord[]> {
    let query = db.select().from(jobPostings);
    const conditions = [];

    if (searchParams.keywords) {
      const keywordSearch = `%${searchParams.keywords.toLowerCase()}%`;
      conditions.push(
        sql`lower(${jobPostings.title}) like ${keywordSearch} or lower(${jobPostings.description}) like ${keywordSearch}`
      );
    }
    
    if (searchParams.location) {
      conditions.push(
        like(jobPostings.location, `%${searchParams.location}%`)
      );
    }
    
    if (searchParams.organization) {
      conditions.push(
        like(jobPostings.organization, `%${searchParams.organization}%`)
      );
    }
    
    if (searchParams.organizationType) {
      conditions.push(
        eq(jobPostings.organizationType, searchParams.organizationType as any)
      );
    }
    
    if (searchParams.employmentType) {
      conditions.push(
        eq(jobPostings.type, searchParams.employmentType as any)
      );
    }
    
    // Always include only active jobs
    conditions.push(eq(jobPostings.isActive, true));
    
    // Exclude specific job IDs if provided
    if (searchParams.excludeIds && searchParams.excludeIds.length > 0) {
      conditions.push(not(inArray(jobPostings.id, searchParams.excludeIds)));
    }
    
    if (conditions.length > 0) {
      // @ts-ignore - TypeScript isn't handling the where condition properly
      query = query.where(and(...conditions));
    }
    
    // Execute the query and return results
    return await query
      .orderBy(desc(jobPostings.datePosted))
      .limit(searchParams.limit || 100)
      .execute();
  }
  
  async findSimilarJobs(
    jobId: number, 
    options: { 
      limit?: number,
      excludeIds?: number[],
      excludeFeedback?: 'NOT_INTERESTED'
    } = {}
  ): Promise<JobPostingRecord[]> {
    const job = await this.getById(jobId);
    if (!job) throw new Error(`Job with ID ${jobId} not found`);
    
    const { limit = 10, excludeIds = [], excludeFeedback } = options;
    
    // Find jobs with similar titles, organizations, or keywords
    const titleWords = job.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const keywordConditions = titleWords.map(word => 
      sql`lower(${jobPostings.title}) like ${`%${word}%`}`
    );
    
    const query = db.select()
      .from(jobPostings)
      .where(and(
        not(eq(jobPostings.id, jobId)),
        eq(jobPostings.isActive, true),
        not(inArray(jobPostings.id, excludeIds)),
        or(
          ...(job.organizationType ? [eq(jobPostings.organizationType, job.organizationType as any)] : []),
          like(jobPostings.organization, `%${job.organization}%`),
          ...keywordConditions
        )
      ))
      .orderBy(desc(jobPostings.datePosted))
      .limit(limit);
    
    return await query;
  }

  async update(id: number, data: Partial<JobPostingRecord>): Promise<JobPostingRecord[]> {
    return await db.update(jobPostings)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(jobPostings.id, id))
      .returning();
  }

  async deactivateBySourceId(sourceId: number): Promise<void> {
    await db.update(jobPostings)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(jobPostings.sourceId, sourceId));
  }
  
  async getJobCountBySourceId(sourceId: number): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`,
    })
    .from(jobPostings)
    .where(and(
      eq(jobPostings.sourceId, sourceId),
      eq(jobPostings.isActive, true)
    ));
    
    return result[0]?.count || 0;
  }
  
  async getJobCountsBySourceIds(sourceIds: number[]): Promise<Record<number, number>> {
    if (sourceIds.length === 0) return {};
    
    const results = await db.select({
      sourceId: jobPostings.sourceId,
      count: sql<number>`count(*)`,
    })
    .from(jobPostings)
    .where(and(
      inArray(jobPostings.sourceId, sourceIds),
      eq(jobPostings.isActive, true)
    ))
    .groupBy(jobPostings.sourceId);
    
    // Convert results to a map of sourceId -> count
    return results.reduce((acc, { sourceId, count }) => {
      acc[sourceId] = count;
      return acc;
    }, {} as Record<number, number>);
  }
  
  async getRecommendedJobs(
    userId: string, 
    options: { 
      limit?: number, 
      excludeIds?: number[]
    } = {}
  ): Promise<JobPostingRecord[]> {
    const { limit = 10, excludeIds = [] } = options;
    
    // Get jobs the user is interested in
    const interestedFeedback = await db.select()
      .from(userJobFeedback)
      .where(and(
        eq(userJobFeedback.userId, userId),
        eq(userJobFeedback.feedbackType, 'INTERESTED')
      ))
      .limit(5);
    
    if (interestedFeedback.length === 0) {
      // If no preferences yet, just return recent jobs
      return await db.select()
        .from(jobPostings)
        .where(and(
          eq(jobPostings.isActive, true),
          not(inArray(jobPostings.id, excludeIds))
        ))
        .orderBy(desc(jobPostings.datePosted))
        .limit(limit);
    }
    
    // Otherwise, get similar jobs to ones the user is interested in
    const interestedJobIds = interestedFeedback.map(feedback => feedback.jobId);
    const interestedJobs = await db.select()
      .from(jobPostings)
      .where(inArray(jobPostings.id, interestedJobIds));
    
    // Get jobs with similar titles, organizations, or keywords
    const allExcludeIds = [...excludeIds, ...interestedJobIds];
    const titleWords = interestedJobs.flatMap(job => 
      job.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    
    const uniqueTitleWords = [...new Set(titleWords)];
    const keywordConditions = uniqueTitleWords.slice(0, 10).map(word => 
      sql`lower(${jobPostings.title}) like ${`%${word}%`}`
    );
    
    const organizationConditions = interestedJobs.map(job => 
      like(jobPostings.organization, `%${job.organization}%`)
    );
    
    const query = db.select()
      .from(jobPostings)
      .where(and(
        eq(jobPostings.isActive, true),
        not(inArray(jobPostings.id, allExcludeIds)),
        or(
          ...keywordConditions,
          ...organizationConditions
        )
      ))
      .orderBy(desc(jobPostings.datePosted))
      .limit(limit);
    
    return await query;
  }
}