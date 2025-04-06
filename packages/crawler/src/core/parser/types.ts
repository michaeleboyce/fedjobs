// File path: packages/crawler/src/core/parser/types.ts
import { AnalyzeLinksInput, JobPostingData, ParsePageInput } from '../../types';
import { AIService } from '@fedjobs/utils';

/**
 * Interface for Link Analyzer components
 */
export interface ILinkAnalyzer {
  /**
   * Analyze links to determine which ones are likely job listings
   */
  analyzeLinks(input: AnalyzeLinksInput): Promise<string[]>;
}

/**
 * Interface for HTML Cleaner components
 */
export interface IHtmlCleaner {
  /**
   * Clean HTML content to extract meaningful text
   */
  cleanHtml(html: string): string;
  
  // Remove the logger property from the interface since it's private in implementation
}

/**
 * Interface for Job Data Extractor components
 */
export interface IJobDataExtractor {
  /**
   * Extract job listings from a webpage
   */
  extractJobListings(input: ParsePageInput): Promise<JobPostingData[]>;
}

/**
 * Interface for Job Enricher components
 */
export interface IJobEnricher {
  /**
   * Enrich job data with additional structured information
   */
  enrichJobData(job: JobPostingData): Promise<JobPostingData>;
}

/**
 * Options for creating a JobParserService
 */
export interface JobParserServiceOptions {
  /**
   * AI service instance to use for text generation
   */
  aiService?: AIService;
  
  /**
   * Link analyzer component
   */
  linkAnalyzer?: ILinkAnalyzer;
  
  /**
   * HTML cleaner component
   */
  htmlCleaner?: IHtmlCleaner;
  
  /**
   * Job data extractor component
   */
  jobDataExtractor?: IJobDataExtractor;
  
  /**
   * Job enricher component
   */
  jobEnricher?: IJobEnricher;
}