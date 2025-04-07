// File path: packages/crawler/src/factory.ts
import { JobSourceRepository, JobPostingRepository } from '@fedjobs/database';
import { ScraperService } from './services/scraper.service';
import { JobSourceService } from './services/job-source.service';
import { CacheService } from './services/cache.service';
import { JobPostingProcessor } from './domain/job-posting.processor';
import { JobPostingValidator } from './domain/job-posting.validator';
import { DuplicateDetector } from './domain/duplicate.detector';
import { WebCrawler } from './core/crawler/WebCrawler';
import { JobParserService } from './core/parser';
import { AIService } from '@fedjobs/utils';

/**
 * Factory function to create a ScraperService with all dependencies
 * This simplifies the creation of a properly configured service
 */
export function createScraperService(): ScraperService {
  // Create repositories
  const jobSourceRepo = new JobSourceRepository();
  const jobPostingRepo = new JobPostingRepository();
  
  // Create AI service (shared)
  const aiService = new AIService();

  // Create validators and detectors
  const jobPostingValidator = new JobPostingValidator(aiService);
  const duplicateDetector = new DuplicateDetector(jobPostingRepo);
  
  // Create processor
  const jobPostingProcessor = new JobPostingProcessor(
    jobPostingRepo,
    jobPostingValidator,
    duplicateDetector
  );
  
  // Create parser and crawler
  const parser = new JobParserService();
  const webCrawler = new WebCrawler(parser);
  
  // Create services
  const jobSourceService = new JobSourceService(jobSourceRepo, jobPostingRepo);
  const cacheService = new CacheService();
  
  // Create and return main service
  return new ScraperService(
    jobSourceService,
    cacheService,
    jobPostingProcessor,
    webCrawler
  );
}