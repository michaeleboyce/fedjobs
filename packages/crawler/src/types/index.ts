// File path: packages/crawler/src/types/index.ts
// packages/crawler/src/types/index.ts

/**
 * URL normalizer function type
 */
export type UrlNormalizer = (url: string) => string;

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

/**
 * Page type classification for crawler decision-making
 */
export enum PageType {
  JOB_LISTING = 'JOB_LISTING', // Multiple jobs on the page
  SINGLE_JOB = 'SINGLE_JOB',   // Single job detail page
  UNKNOWN = 'UNKNOWN'          // Not a job-related page or can't determine
}

/**
 * Result of page classification analysis
 */
export interface PageClassificationResult {
  pageType: PageType;
  confidence: number;          // Confidence score (0-1)
  relevance: number;           // Overall relevance to job search (0-1)
  metadata: {
    estimatedJobCount?: number;  // For JOB_LISTING pages
    jobIndicators?: string[];    // Key terms that influenced the classification
    pageStructure?: string;      // Description of the page structure
    [key: string]: any;          // Additional metadata
  };
}

/**
 * Priority score and metadata for a link
 */
export interface LinkPriority {
  url: string;
  score: number;            // Priority score (higher = more likely job-related)
  reasons: string[];        // Reasons for the score
  estimatedType?: PageType; // Predicted page type (if available)
  visited?: boolean;        // Whether link has been visited
  depth?: number;           // Crawl depth
}

/**
 * Advanced crawl strategy configuration
 */
export interface CrawlStrategy {
  maxDepth: number;               // Maximum crawl depth
  maxPagesPerDomain: number;      // Maximum pages to crawl per domain
  priorityThreshold: number;      // Minimum priority score to follow a link
  includePatterns: RegExp[];      // URL patterns to include
  excludePatterns: RegExp[];      // URL patterns to exclude
  respectRobotsTxt: boolean;      // Whether to respect robots.txt
  followRedirects: boolean;       // Whether to follow redirects
  sameOriginOnly: boolean;        // Only follow links from the same origin
}

/**
 * Detailed results from the crawler
 */
export interface DetailedCrawlResult extends JobCrawlerResult {
  visitedUrls: string[];                  // All URLs visited
  jobUrlsFound: string[];                 // URLs where jobs were found
  failedUrls: Record<string, string>;     // URLs that failed with reasons
  pageClassifications: Record<string, PageClassificationResult>; // Page classifications
  performance: {
    totalDuration: number;      // Total crawl time in ms
    averagePageTime: number;    // Average time per page in ms
    parseTime: number;          // Total time spent parsing in ms
    networkTime: number;        // Total time spent on network in ms
  };
}