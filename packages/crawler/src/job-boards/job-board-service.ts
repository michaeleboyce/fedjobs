// packages/crawler/src/job-boards/job-board-service.ts
import { JobPostingData } from '../types';
import { JobBoardParser, JobBoardParserOptions } from './base-job-board-parser';
import { KNOWN_JOB_BOARDS, isKnownJobBoardDomain } from './constants';
import { Logger } from '../utils/Logger';
import { AshbyParser } from './parsers/ashby-parser';
import { GreenhouseParser } from './parsers/greenhouse-parser';
import { LeverParser } from './parsers/lever-parser';
import { JobParserService } from '../core/parser';

/**
 * Options for the JobBoardService
 */
export interface JobBoardServiceOptions {
  /**
   * Custom parsers to add
   */
  parsers?: JobBoardParser[];
  
  /**
   * Whether to include default parsers (Ashby, Greenhouse, Lever)
   * Default: true
   */
  includeDefaultParsers?: boolean;
  
  /**
   * Generic parser to use for fallbacks
   * If not provided, a new instance will be created
   */
  genericParser?: JobParserService;
}

/**
 * Service that coordinates job board parsing
 */
export class JobBoardService {
  private logger = new Logger('JobBoardService');
  private parsers: JobBoardParser[] = [];
  private genericParser: JobParserService;
  
  constructor(options: JobBoardServiceOptions = {}) {
    // Set up parsers
    if (options.parsers) {
      this.parsers = [...options.parsers];
    }
    
    // Add default parsers if requested or not specified
    if (options.includeDefaultParsers !== false) {
      this.parsers.push(
        new AshbyParser(),
        new GreenhouseParser(),
        new LeverParser()
      );
    }
    
    // Set up generic parser
    this.genericParser = options.genericParser || new JobParserService();
    
    this.logger.info(`Initialized with ${this.parsers.length} job board parsers`);
  }
  
  /**
   * Register a new parser
   */
  registerParser(parser: JobBoardParser): void {
    this.parsers.push(parser);
    this.logger.info(`Registered new parser: ${parser.constructor.name}`);
  }
  
  /**
   * Check if a URL is from a known job board
   */
  isJobBoardUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return isKnownJobBoardDomain(hostname);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the job board name for a URL if it's a known job board
   */
  getJobBoardName(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      const matchedBoard = KNOWN_JOB_BOARDS.find(board => 
        board.domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
      );
      
      return matchedBoard ? matchedBoard.name : null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Parse a job board page using the appropriate parser
   */
  async parseJobBoardPage(options: JobBoardParserOptions): Promise<JobPostingData[]> {
    const { url } = options;
    
    this.logger.info(`Parsing job board page: ${url}`);
    
    // Find parsers that can handle this URL
    const compatibleParsers = this.parsers.filter(p => p.canParse(url));
    
    if (compatibleParsers.length === 0) {
      this.logger.warn(`No specialized parser found for job board URL: ${url}, using generic parser`);
      // Fall back to generic parser
      return await this.genericParser.parseJobsFromPage(options);
    }
    
    // Try each compatible parser in order, stopping at the first one that succeeds
    for (const parser of compatibleParsers) {
      try {
        this.logger.info(`Trying parser: ${parser.constructor.name}`);
        const result = await parser.parse(options);
        
        if (result.error) {
          this.logger.warn(`Parser ${parser.constructor.name} encountered an error: ${result.error.message}`);
          // Continue to next parser if this one failed
          continue;
        }
        
        if (result.jobs.length > 0) {
          this.logger.success(`Parser ${parser.constructor.name} successfully found ${result.jobs.length} jobs`);
          return result.jobs;
        }
        
        this.logger.info(`Parser ${parser.constructor.name} found 0 jobs, trying next parser if available`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Exception in parser ${parser.constructor.name}: ${message}`);
        // Continue to next parser if this one threw an exception
      }
    }
    
    // If all specialized parsers failed, try the generic parser
    this.logger.warn(`All specialized parsers failed for URL: ${url}, falling back to generic parser`);
    try {
      const jobs = await this.genericParser.parseJobsFromPage(options);
      if (jobs.length > 0) {
        this.logger.success(`Generic parser found ${jobs.length} jobs`);
        return jobs;
      }
    } catch (fallbackError) {
      const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      this.logger.error(`Generic parser also failed: ${message}`);
    }
    
    // If we get here, all parsing methods failed
    this.logger.warn(`All parsing methods failed for URL: ${url}`);
    return [];
  }
  
  /**
   * Get additional URLs to crawl based on job board URL
   * This can be used to find company pages on job boards from specific job listings
   */
  getAdditionalUrlsToCrawl(url: string): string[] {
    if (!this.isJobBoardUrl(url)) {
      return [];
    }
    
    // Find a parser that can handle this URL
    const parser = this.parsers.find(p => p.canParse(url));
    if (parser) {
      const additionalUrls = parser.getAdditionalUrlsToCrawl(url);
      if (additionalUrls.length > 0) {
        this.logger.info(`Found ${additionalUrls.length} additional URLs to crawl from ${url}`);
      }
      return additionalUrls;
    }
    
    return [];
  }
}

/**
 * Create a JobBoardService with default parsers
 */
export function createJobBoardService(options: JobBoardServiceOptions = {}): JobBoardService {
  return new JobBoardService(options);
}