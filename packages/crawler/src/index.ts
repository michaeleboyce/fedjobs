// File path: packages/crawler/src/index.ts
import 'reflect-metadata';

// Export services
export { ScraperService } from './services/scraper.service';
export { JobSourceService } from './services/job-source.service';
export { CacheService } from './services/cache.service';

// Export domain layer
export { JobPostingProcessor } from './domain/job-posting.processor';
export { JobPostingValidator, type ValidationResult } from './domain/job-posting.validator';
export { DuplicateDetector } from './domain/duplicate.detector';

// Export core
export { WebCrawler, type CrawlResult } from './core/crawler/WebCrawler';
export { JobParserService } from './core/parser';

// Export utils
export { EmploymentTypeNormalizer } from './utils/employment-type.normalizer';
export { OrganizationTypeNormalizer } from './utils/organization-type.normalizer';
export { Logger } from './utils/Logger';

// Export factory for easy instantiation
export { createScraperService } from './factory';

// Export types
export * from './types';

// Package version
export const version = '0.1.0';