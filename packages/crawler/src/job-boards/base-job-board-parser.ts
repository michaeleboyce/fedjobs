// packages/crawler/src/job-boards/base-job-board-parser.ts
import { JobPostingData } from '../types';
import { Logger } from '../utils/Logger';

export interface JobBoardParseResult {
  jobs: JobPostingData[];
  error?: Error;
}

export interface JobBoardParserOptions {
  url: string;
  content: string;
  title: string;
  description: string;
  keywords?: string;
}

export interface JobBoardParser {
  /**
   * Check if this parser can handle the given URL
   */
  canParse(url: string): boolean;
  
  /**
   * Parse job data from the page
   */
  parse(options: JobBoardParserOptions): Promise<JobBoardParseResult>;
  
  /**
   * Get additional URLs to crawl based on the current URL
   * For example, a specific job page might lead to the company's job listing page
   */
  getAdditionalUrlsToCrawl(url: string): string[];
}

/**
 * Base implementation of a job board parser
 */
export abstract class BaseJobBoardParser implements JobBoardParser {
  protected logger: Logger;
  
  constructor(protected name: string) {
    this.logger = new Logger(`${name}Parser`);
  }
  
  /**
   * Check if this parser can handle the given URL
   */
  abstract canParse(url: string): boolean;
  
  /**
   * Parse job data from the page
   */
  abstract parse(options: JobBoardParserOptions): Promise<JobBoardParseResult>;
  
  /**
   * Get additional URLs to crawl based on the current URL
   */
  getAdditionalUrlsToCrawl(url: string): string[] {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // If this is a specific job page (has more than one path part),
      // add the company page to the crawl list
      if (pathParts.length > 1) {
        const companyPath = pathParts[0];
        const baseUrl = `${urlObj.protocol}//${urlObj.host}/${companyPath}`;
        return [baseUrl];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Helper method to extract company name from URL
   */
  protected extractCompanyName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length > 0) {
        return pathParts[0];
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }
}