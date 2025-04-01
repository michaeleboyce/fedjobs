import { JobPostingData } from '../types';

/**
 * Analysis context containing information for link analysis
 */
export interface LinkAnalysisContext {
  sourceUrl: string;
  pageTitle: string;
}

/**
 * Link information for analysis
 */
export interface LinkInfo {
  href: string;
  text: string;
  title: string;
  aria: string;
}

/**
 * Input for analyzing links
 */
export interface AnalyzeLinksInput {
  links: LinkInfo[];
  sourceUrl: string;
  pageTitle: string;
}

/**
 * Input for parsing a page
 */
export interface ParsePageInput {
  url: string;
  content: string;
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Interface defining parsing operations for job data
 */
export interface IParser {
  /**
   * Analyze a set of links to determine which ones are likely job listings
   * @param input Input data for link analysis
   * @returns Array of URLs that likely lead to job postings
   */
  analyzeLinks(input: AnalyzeLinksInput): Promise<string[]>;
  
  /**
   * Parse job listings from a webpage
   * @param input Page data to parse
   * @returns Array of job postings found on the page
   */
  parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]>;
  
  /**
   * Enrich job data with additional structured information
   * @param job Basic job data
   * @returns Enriched job data
   */
  enrichJobData(job: JobPostingData): Promise<JobPostingData>;
}