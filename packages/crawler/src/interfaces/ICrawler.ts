import { CrawlJobOptions, JobPostingData } from '../types';

/**
 * Interface defining the core crawler functionality
 */
export interface ICrawler {
  /**
   * Crawl a website for job listings
   * @param options Configuration options for the crawl
   * @returns Promise resolving to an array of found job postings
   */
  crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]>;
  
  /**
   * Cancel an active crawler for a specific job source
   * @param sourceId The ID of the source to cancel
   * @returns Promise resolving to whether cancellation was successful
   */
  cancelCrawler(sourceId: number): Promise<boolean>;
}