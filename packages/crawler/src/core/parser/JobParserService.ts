// File path: packages/crawler/src/core/parser/JobParserService.ts
import { AIService, AIServiceError } from '@fedjobs/utils';
import { AnalyzeLinksInput, JobPostingData, ParsePageInput } from '../../types';
import { Logger } from '../../utils/Logger';
import { HtmlCleaner } from './HtmlCleaner';
import { LinkAnalyzer } from './LinkAnalyzer';
import { JobDataExtractor } from './JobDataExtractor';
import { JobEnricher } from './JobEnricher';
import { 
  IHtmlCleaner, 
  ILinkAnalyzer, 
  IJobDataExtractor, 
  IJobEnricher,
  JobParserServiceOptions 
} from './types';

/**
 * Main service that orchestrates the job parsing process
 * This is a facade that delegates to specialized components
 */
export class JobParserService {
  private aiService: AIService;
  private linkAnalyzer: ILinkAnalyzer;
  private htmlCleaner: IHtmlCleaner;
  private jobDataExtractor: IJobDataExtractor;
  private jobEnricher: IJobEnricher;
  private logger: Logger;
  
  constructor(options?: JobParserServiceOptions) {
    this.logger = new Logger('JobParserService');
    
    // Initialize AI service
    this.aiService = options?.aiService || new AIService();
    
    // Initialize components, using provided ones or creating defaults
    this.linkAnalyzer = options?.linkAnalyzer || new LinkAnalyzer(this.aiService);
    this.htmlCleaner = options?.htmlCleaner || new HtmlCleaner();
    this.jobDataExtractor = options?.jobDataExtractor || new JobDataExtractor(this.aiService, this.htmlCleaner);
    this.jobEnricher = options?.jobEnricher || new JobEnricher(this.aiService);
  }
  
  /**
   * Get the underlying AI service
   * This is useful for direct AI operations
   */
  getAIService(): AIService {
    return this.aiService;
  }
  
  /**
   * Analyzes a batch of links to determine which ones are likely job listings
   * Returns an array of URLs that should be prioritized for crawling
   */
  async analyzeLinks(input: AnalyzeLinksInput): Promise<string[]> {
    try {
      this.logger.info(`Analyzing ${input.links.length} links from ${input.sourceUrl}`);
      
      // Validate input
      if (!input.links || input.links.length === 0) {
        this.logger.info(`No links to analyze from ${input.sourceUrl}`);
        return [];
      }
      
      if (!input.sourceUrl) {
        this.logger.warn('Missing sourceUrl in analyzeLinks input');
      }
      
      // Delegate to LinkAnalyzer with proper error handling
      try {
        const result = await this.linkAnalyzer.analyzeLinks(input);
        this.logger.info(`LinkAnalyzer identified ${result.length} job links out of ${input.links.length} total links`);
        return result;
      } catch (error) {
        if (error instanceof AIServiceError) {
          this.logger.error(`AI service error during link analysis:`, {
            provider: error.provider,
            model: error.model,
            message: error.message,
            statusCode: error.statusCode,
            sourceUrl: input.sourceUrl,
          });
        } else {
          this.logger.error(`Error in LinkAnalyzer:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            sourceUrl: input.sourceUrl,
          });
        }
        
        // Return empty array on failure
        return [];
      }
    } catch (error) {
      this.logger.error(`Unexpected error in analyzeLinks:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }
  
  /**
   * Parse job listings from a webpage
   * @param input Page data to parse
   * @returns Array of job postings found on the page
   */
  async parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]> {
    try {
      this.logger.info(`Parsing jobs from page: ${input.url}`);
      
      // Validate input
      if (!input.content) {
        this.logger.warn(`Missing content for URL: ${input.url}`);
        return [];
      }
      
      // Delegate to JobDataExtractor with proper error handling
      try {
        const result = await this.jobDataExtractor.extractJobListings(input);
        this.logger.info(`Extracted ${result.length} job listings from ${input.url}`);
        return result;
      } catch (error) {
        if (error instanceof AIServiceError) {
          this.logger.error(`AI service error during job extraction:`, {
            provider: error.provider,
            model: error.model,
            message: error.message,
            statusCode: error.statusCode,
            url: input.url,
          });
        } else {
          this.logger.error(`Error in JobDataExtractor:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            url: input.url,
          });
        }
        
        // Return empty array on failure
        return [];
      }
    } catch (error) {
      this.logger.error(`Unexpected error in parseJobsFromPage:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url: input.url,
      });
      return [];
    }
  }
  
  /**
   * Enrich job data with additional structured information
   * @param job Basic job data
   * @returns Enriched job data
   */
  async enrichJobData(job: JobPostingData): Promise<JobPostingData> {
    try {
      this.logger.info(`Enriching job data for: ${job.title}`);
      
      // Validate input
      if (!job.description || job.description.length < 100) {
        this.logger.warn(`Job description too short for enrichment: ${job.title}`);
        return job;
      }
      
      // Delegate to JobEnricher with proper error handling
      try {
        const result = await this.jobEnricher.enrichJobData(job);
        this.logger.info(`Successfully enriched job data for ${job.title}`);
        return result;
      } catch (error) {
        if (error instanceof AIServiceError) {
          this.logger.error(`AI service error during job enrichment:`, {
            provider: error.provider,
            model: error.model,
            message: error.message,
            statusCode: error.statusCode,
            jobTitle: job.title,
          });
        } else {
          this.logger.error(`Error in JobEnricher:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            jobTitle: job.title,
          });
        }
        
        // Return original job on failure
        return job;
      }
    } catch (error) {
      this.logger.error(`Unexpected error in enrichJobData:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        jobTitle: job.title,
      });
      return job;
    }
  }
  
  /**
   * Clean HTML content to extract meaningful text
   * @param html HTML content
   * @returns Cleaned text
   */
  cleanHtml(html: string): string {
    try {
      if (!html) {
        this.logger.warn('Empty HTML content provided to cleanHtml');
        return '';
      }
      
      return this.htmlCleaner.cleanHtml(html);
    } catch (error) {
      this.logger.error(`Error cleaning HTML:`, {
        error: error instanceof Error ? error.message : String(error),
        htmlLength: html?.length || 0,
      });
      
      // Return empty string on failure
      return '';
    }
  }
}