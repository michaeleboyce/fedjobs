import { CrawlJobOptions, JobPostingData } from '../types';

export interface ICrawler {
  crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]>;
  cancelCrawler(sourceId: number): Promise<boolean>;
}
