// File path: packages/crawler/src/domain/duplicate.detector.ts
import { JobPostingData } from '../types';
import { JobPostingRepository } from '@fedjobs/database';
import { Logger } from '../utils/Logger';

/**
 * Detects duplicate job postings
 */
export class DuplicateDetector {
  private logger = new Logger('DuplicateDetector');
  private jobPostingRepo: JobPostingRepository;
  
  constructor(jobPostingRepo: JobPostingRepository) {
    this.jobPostingRepo = jobPostingRepo;
  }
  
  /**
   * Find a duplicate job posting in the database
   * @param sourceId Source ID to check against
   * @param jobData Job data to check
   * @returns Existing job ID if found, null otherwise
   */
  async findDuplicate(sourceId: number, jobData: JobPostingData): Promise<number | null> {
    try {
      // Strategy 1: Check for exact URL match within this source
      const existingByUrl = await this.findDuplicateByUrl(sourceId, jobData.url);
      if (existingByUrl) {
        this.logger.info(`Found existing job with matching URL: ${existingByUrl}`);
        return existingByUrl;
      }
      
      // Strategy 2: Check for title + organization match within this source
      const existingByTitleOrg = await this.findDuplicateByTitleAndOrg(
        sourceId, 
        jobData.title, 
        jobData.organization
      );
      
      if (existingByTitleOrg) {
        this.logger.info(`Found existing job with matching title and organization: ${existingByTitleOrg}`);
        return existingByTitleOrg;
      }
      
      // No duplicate found
      return null;
    } catch (error) {
      this.logger.error('Error checking for duplicate job:', error as Record<string, any>);
      return null;
    }
  }
  
  /**
   * Find duplicate by URL
   * @private
   */
  private async findDuplicateByUrl(sourceId: number, url: string): Promise<number | null> {
    const existingJob = await this.jobPostingRepo.findByUrlAndSourceId(url, sourceId);
    return existingJob ? existingJob.id : null;
  }
  
  /**
   * Find duplicate by title and organization
   * @private
   */
  private async findDuplicateByTitleAndOrg(
    sourceId: number, 
    title: string, 
    organization: string
  ): Promise<number | null> {
    const existingJob = await this.jobPostingRepo.findByTitleAndOrganization(
      title, 
      organization,
      sourceId
    );
    return existingJob ? existingJob.id : null;
  }
}