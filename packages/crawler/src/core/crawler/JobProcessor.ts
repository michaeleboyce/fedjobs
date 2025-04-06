// File path: packages/crawler/src/core/crawler/JobProcessor.ts
import { JobPostingData } from '../../types';

/**
 * Processes job data found on pages
 */
export class JobProcessor {
  /**
   * Process job data found on a page
   */
  async processJobData(
    jobData: JobPostingData[], 
    results: JobPostingData[], 
    maxJobs: number,
    onJobFound?: (job: JobPostingData) => Promise<void>
  ): Promise<void> {
    for (const job of jobData) {
      // Skip if we've already found enough jobs
      if (results.length >= maxJobs) {
        break;
      }
      
      // Check for duplicates based on URL and title
      const isDuplicate = this.isDuplicateJob(job, results);
      
      if (!isDuplicate) {
        // Add to results
        results.push(job);
        console.log(`[JobProcessor] Added job to results: ${job.title}`);
        
        // Call onJobFound callback if provided
        if (onJobFound) {
          await onJobFound(job);
        }
      } else {
        console.log(`[JobProcessor] Skipping duplicate job: ${job.title}`);
      }
    }
  }
  
  /**
   * Check if a job is a duplicate
   */
  private isDuplicateJob(job: JobPostingData, existingJobs: JobPostingData[]): boolean {
    return existingJobs.some(existingJob => 
      existingJob.url === job.url && existingJob.title === job.title
    );
  }
}