// packages/crawler/src/types/index.ts

/**
 * Represents a job posting found during crawling
 */
export interface JobPostingData {
  title: string;
  organization: string;
  location?: string;
  description: string;
  salary?: string;
  requirements?: string;
  url: string;
  employmentType?: string;
  experience?: string;
  skills?: string[];
  benefits?: string;
  organizationType?: string;
  datePosted?: Date;
  dateScraped: Date;
  structuredData?: Record<string, any>;
  externalId?: string;
}

/**
 * Result of a job crawling operation
 */
export interface JobCrawlerResult {
  sourceId: number;
  url: string;
  jobsFound: number;
  jobsStored: number;
  error?: string;
  usedCache?: boolean; // Indicates if the result came from cache
  dateCompleted: Date;
}

/**
 * Request to refresh a job source
 */
export interface JobSourceRefreshRequest {
  sourceId: number;
  url: string;
  keywords?: string;
  userId: string;
}

/**
 * Enum for link enqueuing strategies
 */
export enum EnqueueStrategy {
  NONE = 'none',
  KEYWORD_BASED = 'keyword',
  AI_POWERED = 'ai'
}

/**
 * Page metadata extracted during crawling
 */
export interface PageMetadata {
  content: string;
  title: string;
  description: string;
}

/**
 * Options for crawling a job site
 */
export interface CrawlJobOptions {
  url: string;
  keywords?: string;
  maxJobs?: number;
  sourceId?: number;
  onJobFound?: (job: JobPostingData) => Promise<void>;
  onComplete?: (jobs: JobPostingData[]) => Promise<void>;
  onError?: (error: Error, url: string) => Promise<void>;
}

/**
 * Input parameters for parsing a page
 */
export interface ParsePageInput {
  url: string;
  content: string;
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Input for analyzing links on a page
 */
export interface AnalyzeLinksInput {
  sourceUrl: string;
  pageTitle: string;
  links: Array<{
    href: string;
    text: string;
    title: string;
    aria: string;
  }>;
}

/**
 * URL history entry for crawler
 */
export interface CrawlHistoryEntry {
  url: string;
  visitedAt: Date;
  sourceId: number;
  jobsFound: number;
}