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
      this.logger.info(`[JobParserService] Analyzing ${input.links.length} links from ${input.sourceUrl}`);
      
      // Validate input
      if (!input.links || input.links.length === 0) {
        this.logger.info(`[JobParserService] No links to analyze from ${input.sourceUrl}`);
        return [];
      }
      
      if (!input.sourceUrl) {
        this.logger.warn(`[JobParserService] Missing sourceUrl in analyzeLinks input`);
      }
      
      // Check for obvious job board links as a pre-optimization
      const jobBoardLinks = input.links.filter(link => {
        try {
          return link.href.includes('greenhouse.io/') || 
                 link.href.includes('lever.co/') || 
                 link.href.includes('workday.com/');
        } catch (e) {
          return false;
        }
      });
      
      // If we have a small number of clear job board links, prioritize them
      if (jobBoardLinks.length > 0 && jobBoardLinks.length <= 20) {
        this.logger.info(`[JobParserService] Found ${jobBoardLinks.length} obvious job board links, skipping AI analysis`);
        return jobBoardLinks.map(link => link.href);
      }
      
      // Delegate to LinkAnalyzer with proper error handling
      try {
        const result = await this.linkAnalyzer.analyzeLinks(input);
        this.logger.info(`[JobParserService] LinkAnalyzer identified ${result.length} job links out of ${input.links.length} total links`);
        
        // If AI found no links but we have obvious job board links, use those instead
        if (result.length === 0 && jobBoardLinks.length > 0) {
          this.logger.warn(`[JobParserService] AI found no links but we have ${jobBoardLinks.length} job board links - using as fallback`);
          const fallbackLinks = jobBoardLinks.slice(0, 20).map(link => link.href);
          return fallbackLinks;
        }
        
        return result;
      } catch (error) {
        if (error instanceof AIServiceError) {
          this.logger.error(`[JobParserService] AI service error during link analysis:`, {
            provider: error.provider,
            model: error.model,
            message: error.message,
            statusCode: error.statusCode,
            sourceUrl: input.sourceUrl,
          });
        } else {
          this.logger.error(`[JobParserService] Error in LinkAnalyzer:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            sourceUrl: input.sourceUrl,
          });
        }
        
        // Return job board links as fallback if the AI service fails
        if (jobBoardLinks.length > 0) {
          this.logger.info(`[JobParserService] Using ${Math.min(jobBoardLinks.length, 20)} job board links as fallback after AI error`);
          return jobBoardLinks.slice(0, 20).map(link => link.href);
        }
        
        // Return empty array if no fallback available
        return [];
      }
    } catch (error) {
      this.logger.error(`[JobParserService] Unexpected error in analyzeLinks:`, {
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
      this.logger.info(`[JobParserService] Parsing jobs from page: ${input.url}`);
      
      // Validate input
      if (!input.content) {
        this.logger.warn(`[JobParserService] Missing content for URL: ${input.url}`);
        return [];
      }
      
      // Delegate to JobDataExtractor with proper error handling
      try {
        const result = await this.jobDataExtractor.extractJobListings(input);
        this.logger.info(`[JobParserService] Extracted ${result.length} job listings from ${input.url}`);
        return result;
      } catch (error) {
        if (error instanceof AIServiceError) {
          this.logger.error(`[JobParserService] AI service error during job extraction:`, {
            provider: error.provider,
            model: error.model,
            message: error.message,
            statusCode: error.statusCode,
            url: input.url,
          });
        } else {
          this.logger.error(`[JobParserService] Error in JobDataExtractor:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            url: input.url,
          });
        }
        
        // Return empty array on failure
        return [];
      }
    } catch (error) {
      this.logger.error(`[JobParserService] Unexpected error in parseJobsFromPage:`, {
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
      this.logger.info(`[JobParserService] Enriching job data for: ${job.title}`);
      
      // Validate input
      if (!job.description || job.description.length < 100) {
        this.logger.warn(`[JobParserService] Job description too short for enrichment: ${job.title}`);
        return job;
      }
      
      // Delegate to JobEnricher with proper error handling
      try {
        const result = await this.jobEnricher.enrichJobData(job);
        this.logger.info(`[JobParserService] Successfully enriched job data for ${job.title}`);
        return result;
      } catch (error) {
        if (error instanceof AIServiceError) {
          this.logger.error(`[JobParserService] AI service error during job enrichment:`, {
            provider: error.provider,
            model: error.model,
            message: error.message,
            statusCode: error.statusCode,
            jobTitle: job.title,
          });
        } else {
          this.logger.error(`[JobParserService] Error in JobEnricher:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            jobTitle: job.title,
          });
        }
        
        // Return original job on failure
        return job;
      }
    } catch (error) {
      this.logger.error(`[JobParserService] Unexpected error in enrichJobData:`, {
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
        this.logger.warn('[JobParserService] Empty HTML content provided to cleanHtml');
        return '';
      }
      
      return this.htmlCleaner.cleanHtml(html);
    } catch (error) {
      this.logger.error(`[JobParserService] Error cleaning HTML:`, {
        error: error instanceof Error ? error.message : String(error),
        htmlLength: html?.length || 0,
      });
      
      // Return empty string on failure
      return '';
    }
  }
}