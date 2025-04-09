// packages/crawler/src/job-boards/job-board-crawler-factory.ts
import { JobSourceRepository, JobPostingRepository } from '@fedjobs/database';
import { WebCrawler } from '../core/crawler/WebCrawler';
import { JobParserService } from '../core/parser';
import { JobSourceService } from '../services/job-source.service';
import { CacheService } from '../services/cache.service';
import { JobPostingProcessor } from '../domain/job-posting.processor';
import { JobPostingValidator } from '../domain/job-posting.validator';
import { DuplicateDetector } from '../domain/duplicate.detector';
import { ScraperService } from '../services/scraper.service';
import { createJobBoardService, JobBoardService } from './job-board-service';
import { AshbyParser, GreenhouseParser, LeverParser } from './parsers';
import { JobBoardParser } from './base-job-board-parser';
import { Logger } from '../utils/Logger';

/**
 * Options for creating a job board-focused crawler
 */
export interface JobBoardCrawlerOptions {
  /**
   * Custom job board parsers to add
   */
  customParsers?: JobBoardParser[];
  
  /**
   * Whether to include default parsers (Ashby, Greenhouse, Lever)
   * Default: true
   */
  includeDefaultParsers?: boolean;
  
  /**
   * Optional logging level to set
   */
  logLevel?: number;
}

/**
 * Creates a ScraperService optimized for crawling job boards
 */
export function createJobBoardCrawler(options: JobBoardCrawlerOptions = {}): ScraperService {
  const logger = new Logger('JobBoardCrawlerFactory');
  logger.info('Creating job board-focused crawler');
  
  // Set up job board service with parsers
  const jobBoardService = new JobBoardService();
  
  // Add default parsers if requested (default is true)
  if (options.includeDefaultParsers !== false) {
    logger.info('Adding default job board parsers');
    jobBoardService.registerParser(new AshbyParser());
    jobBoardService.registerParser(new GreenhouseParser());
    jobBoardService.registerParser(new LeverParser());
  }
  
  // Add custom parsers if provided
  if (options.customParsers && options.customParsers.length > 0) {
    logger.info(`Adding ${options.customParsers.length} custom job board parsers`);
    options.customParsers.forEach(parser => {
      jobBoardService.registerParser(parser);
    });
  }
  
  // Create repositories
  const jobSourceRepo = new JobSourceRepository();
  const jobPostingRepo = new JobPostingRepository();
  
  // Create parser and crawler
  const jobParser = new JobParserService();
  const webCrawler = new WebCrawler(jobParser);
  
  // Create validators and detectors
  const jobPostingValidator = new JobPostingValidator();
  const duplicateDetector = new DuplicateDetector(jobPostingRepo);
  
  // Create processor
  const jobPostingProcessor = new JobPostingProcessor(
    jobPostingRepo,
    jobPostingValidator,
    duplicateDetector
  );
  
  // Create services
  const jobSourceService = new JobSourceService(jobSourceRepo, jobPostingRepo);
  const cacheService = new CacheService();
  
  // Create and return main service
  const scraperService = new ScraperService(
    jobSourceService,
    cacheService,
    jobPostingProcessor,
    webCrawler
  );
  
  logger.info('Job board crawler created successfully');
  return scraperService;
}