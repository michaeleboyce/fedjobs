// File path: packages/crawler/src/domain/job-posting.processor.ts
import { JobPostingData } from '../types';
import { JobPostingRepository } from '@fedjobs/database';
import { JobPostingValidator } from './job-posting.validator';
import { DuplicateDetector } from './duplicate.detector';
import { EmploymentTypeNormalizer } from '../utils/employment-type.normalizer';
import { OrganizationTypeNormalizer } from '../utils/organization-type.normalizer';
import { Logger } from '../utils/Logger';

/**
 * Processes job postings for storing in the database
 */
export class JobPostingProcessor {
  private logger = new Logger('JobPostingProcessor');
  private jobPostingRepo: JobPostingRepository;
  private validator: JobPostingValidator;
  private duplicateDetector: DuplicateDetector;
  
  constructor(
    jobPostingRepo: JobPostingRepository,
    validator: JobPostingValidator,
    duplicateDetector: DuplicateDetector
  ) {
    this.jobPostingRepo = jobPostingRepo;
    this.validator = validator;
    this.duplicateDetector = duplicateDetector;
  }
  
  /**
   * Process a job posting for storing in the database
   * @param sourceId Source ID to associate the job with
   * @param jobData Job data to process
   * @returns ID of the created or updated job posting, or -1 if invalid
   */
  async processJob(sourceId: number, jobData: JobPostingData): Promise<number> {
    try {
      this.logger.info(`Processing job: "${jobData.title}" at ${jobData.organization}`);
      
      // Step 1: Validate the job posting
      const validation = await this.validator.validateJob(jobData);
      if (!validation.isValid) {
        this.logger.info(`Skipping invalid job posting: ${validation.reasons?.join(', ')}`);
        return -1; // Invalid job
      }
      
      // Step 2: Check for duplicates
      const existingJobId = await this.duplicateDetector.findDuplicate(sourceId, jobData);
      
      // Step 3: Either update existing or create new job
      if (existingJobId) {
        return await this.updateExistingJob(existingJobId, jobData);
      } else {
        return await this.createNewJob(sourceId, jobData);
      }
    } catch (error) {
      this.logger.error('Error processing job posting:', error as Record<string, any>);
      return -1;
    }
  }
  
  /**
   * Update an existing job
   * @private
   */
  private async updateExistingJob(jobId: number, jobData: JobPostingData): Promise<number> {
    this.logger.info(`Updating existing job with ID: ${jobId}`);
    
    await this.jobPostingRepo.update(jobId, {
      title: jobData.title,
      organization: jobData.organization,
      location: jobData.location || '',
      description: jobData.description,
      salary: jobData.salary || null,
      requirements: jobData.requirements || null,
      url: jobData.url,
      type: EmploymentTypeNormalizer.normalize(jobData.employmentType) || null,
      externalId: jobData.externalId || null,
      organizationType: OrganizationTypeNormalizer.normalize(jobData.organizationType) || null,
      dateScraped: new Date(), // Update scrape date
      isActive: true, // Mark as active
      structuredData: {
        ...(jobData.structuredData || {}),
        updateHistory: [
          ...(jobData.structuredData?.updateHistory || []),
          { date: new Date().toISOString(), action: 'updated' }
        ]
      },
      skills: jobData.skills || []
    });
    
    return jobId;
  }
  
  /**
   * Create a new job
   * @private
   */
  private async createNewJob(sourceId: number, jobData: JobPostingData): Promise<number> {
    this.logger.info(`Creating new job entry for sourceId ${sourceId}`);
    
    const newJob = await this.jobPostingRepo.insert({
      sourceId,
      title: jobData.title,
      organization: jobData.organization,
      location: jobData.location || '',
      description: jobData.description,
      salary: jobData.salary || null,
      requirements: jobData.requirements || null,
      url: jobData.url,
      type: EmploymentTypeNormalizer.normalize(jobData.employmentType) || null,
      externalId: jobData.externalId || null,
      organizationType: OrganizationTypeNormalizer.normalize(jobData.organizationType) || null,
      datePosted: jobData.datePosted || new Date(),
      dateScraped: new Date(),
      structuredData: {
        ...(jobData.structuredData || {}),
        creationHistory: [
          { date: new Date().toISOString(), action: 'created' }
        ]
      },
      skills: jobData.skills || []
    });
    
    this.logger.info(`Successfully stored new job with ID: ${newJob.id}`);
    return newJob.id;
  }
}