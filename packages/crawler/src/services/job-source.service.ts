// File path: packages/crawler/src/services/job-source.service.ts
import { JobSourceRepository, JobPostingRepository, JobPostingRecord } from '@fedjobs/database';
import { JobPostingData } from '../types';
import { Logger } from '../utils/Logger';

/**
 * Service for managing job sources and their related data
 */
export class JobSourceService {
  private logger = new Logger('JobSourceService');
  private jobSourceRepo: JobSourceRepository;
  private jobPostingRepo: JobPostingRepository;
  
  constructor(
    jobSourceRepo: JobSourceRepository,
    jobPostingRepo: JobPostingRepository
  ) {
    this.jobSourceRepo = jobSourceRepo;
    this.jobPostingRepo = jobPostingRepo;
  }
  
  /**
   * Get a job source by ID
   * @param sourceId Source ID to get
   * @throws Error if source not found
   */
  async getSourceById(sourceId: number): Promise<any> {
    const source = await this.jobSourceRepo.getById(sourceId);
    if (!source) {
      throw new Error(`Job source with ID ${sourceId} not found`);
    }
    return source;
  }
  
  /**
   * Update a job source's status
   * @param sourceId Source ID to update
   * @param status New status value
   * @param errorMessage Optional error message
   */
  async updateSourceStatus(
    sourceId: number, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    await this.jobSourceRepo.updateStatus(sourceId, status, errorMessage);
  }
  
  /**
   * Get sources due for refresh based on frequency
   * @param frequency The refresh frequency (DAILY, WEEKLY, etc)
   */
  async getSourcesForFrequency(frequency: string): Promise<any[]> {
    return this.jobSourceRepo.getSourcesForScheduledRefresh(frequency);
  }
  
  /**
   * Deactivate all jobs for a source
   * @param sourceId Source ID
   */
  async deactivateSourceJobs(sourceId: number): Promise<void> {
    await this.jobPostingRepo.deactivateBySourceId(sourceId);
  }
  
  /**
   * Get all jobs for a source
   * @param sourceId Source ID
   */
  async getJobsForSource(sourceId: number): Promise<JobPostingData[]> {
    const jobs = await this.jobPostingRepo.getBySourceId(sourceId);
    
    // Convert database records to JobPostingData
    return jobs.map((job: JobPostingRecord) => ({
      title: job.title,
      organization: job.organization,
      location: job.location || undefined,
      description: job.description,
      salary: job.salary || undefined,
      requirements: job.requirements || undefined,
      url: job.url,
      employmentType: job.type || undefined,
      experience: job.experience || undefined,
      skills: job.skills as string[] || [],
      benefits: job.benefits || undefined,
      organizationType: job.organizationType || undefined,
      datePosted: job.datePosted || undefined,
      dateScraped: job.dateScraped,
      structuredData: job.structuredData as Record<string, any> || {},
      externalId: job.externalId || undefined
    }));
  }
  
  /**
   * Update a source after a successful crawl
   * 
   * This method updates the job source record with:
   * - Status changed to 'ACTIVE' to indicate crawl completion
   * - lastScraped timestamp set to current date/time
   * - usedCache flag set to false (indicating a fresh crawl)
   * 
   * @param sourceId Source ID to update
   */
  async updateSourceAfterCrawl(sourceId: number): Promise<void> {
    await this.jobSourceRepo.update(sourceId, {
      status: 'ACTIVE',
      lastScraped: new Date(),
      usedCache: false
    });
  }
  
  /**
   * Get the job count for a source
   * @param sourceId Source ID
   */
  async getJobCount(sourceId: number): Promise<number> {
    const counts = await this.jobPostingRepo.getJobCountsBySourceIds([sourceId]);
    return counts[sourceId] || 0;
  }
}