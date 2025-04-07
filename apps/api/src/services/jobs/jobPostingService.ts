// apps/api/src/services/jobs/jobPostingService.ts
import {
    JobPostingRepository,
    JobPostingRecord,
    NewJobPostingRecord
  } from '@fedjobs/database';
  import { NotFoundError } from '../../utils/errors';
  
  /**
   * Service for managing job postings
   */
  export class JobPostingService {
    /**
     * Create a new job posting service
     */
    constructor(private jobPostingRepo: JobPostingRepository) {}
  
    /**
     * Get a job posting by ID
     */
    public async getById(id: number): Promise<JobPostingRecord> {
      const job = await this.jobPostingRepo.getById(id);
      if (!job) {
        throw new NotFoundError(`Job posting with ID ${id} not found`);
      }
      return job;
    }
  
    /**
     * Get job postings by source ID
     */
    public async getBySourceId(sourceId: number): Promise<JobPostingRecord[]> {
      return this.jobPostingRepo.getBySourceId(sourceId);
    }
  
    /**
     * Search for job postings
     */
    public async searchJobs(params: {
      keywords?: string;
      location?: string;
      organization?: string;
      organizationType?: string;
      employmentType?: string;
      userId?: string;
      limit?: number;
      offset?: number;
    }): Promise<JobPostingRecord[]> {
      return this.jobPostingRepo.searchJobs(params);
    }
  
    /**
     * Count jobs matching search criteria
     */
    public async countJobs(params: {
      keywords?: string;
      location?: string;
      organization?: string;
      organizationType?: string;
      employmentType?: string;
      userId?: string;
    }): Promise<number> {
      return this.jobPostingRepo.countJobs(params);
    }
  
    /**
     * Get similar jobs to the specified job
     */
    public async getSimilarJobs(
      jobId: number,
      limit: number = 5
    ): Promise<JobPostingRecord[]> {
      const job = await this.getById(jobId);
      return this.jobPostingRepo.getSimilarJobs(job.id, limit);
    }
  
    /**
     * Get recommended jobs for a user
     */
    public async getRecommendedJobs(
      userId: string,
      options: {
        limit?: number;
        excludeIds?: number[];
      } = {}
    ): Promise<JobPostingRecord[]> {
      return this.jobPostingRepo.getRecommendedJobs(userId, options);
    }
  
    /**
     * Create a new job posting
     */
    public async createJob(job: NewJobPostingRecord): Promise<JobPostingRecord> {
      return this.jobPostingRepo.insert(job);
    }
  
    /**
     * Update a job posting
     */
    public async updateJob(
      id: number,
      data: Partial<JobPostingRecord>
    ): Promise<JobPostingRecord> {
      const updatedJobs = await this.jobPostingRepo.update(id, data);
      if (!updatedJobs.length) {
        throw new NotFoundError(`Job posting with ID ${id} not found`);
      }
      return updatedJobs[0];
    }
  
    /**
     * Deactivate all jobs for a source
     */
    public async deactivateJobsBySourceId(sourceId: number): Promise<void> {
      await this.jobPostingRepo.deactivateBySourceId(sourceId);
    }
  
    /**
     * Create multiple job postings in a single operation
     */
    public async bulkCreateJobs(
      jobs: NewJobPostingRecord[]
    ): Promise<JobPostingRecord[]> {
      return this.jobPostingRepo.bulkInsert(jobs);
    }
  }