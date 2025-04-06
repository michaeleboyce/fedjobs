// File path: packages/crawler/src/core/parser/JobParserService.ts
import { AIService } from '@fedjobs/utils';
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
    this.logger.info(`Analyzing ${input.links.length} links from ${input.sourceUrl}`);
    return this.linkAnalyzer.analyzeLinks(input);
  }
  
  /**
   * Parse job listings from a webpage
   * @param input Page data to parse
   * @returns Array of job postings found on the page
   */
  async parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]> {
    this.logger.info(`Parsing jobs from page: ${input.url}`);
    return this.jobDataExtractor.extractJobListings(input);
  }
  
  /**
   * Enrich job data with additional structured information
   * @param job Basic job data
   * @returns Enriched job data
   */
  async enrichJobData(job: JobPostingData): Promise<JobPostingData> {
    this.logger.info(`Enriching job data for: ${job.title}`);
    return this.jobEnricher.enrichJobData(job);
  }
  
  /**
   * Clean HTML content to extract meaningful text
   * @param html HTML content
   * @returns Cleaned text
   */
  cleanHtml(html: string): string {
    return this.htmlCleaner.cleanHtml(html);
  }
}