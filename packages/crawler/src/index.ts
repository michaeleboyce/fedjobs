// packages/crawler/src/index.ts
import 'reflect-metadata';

// Export core functionality
export { WebCrawler } from './core/crawler';
export { JobParserService } from './core/parser';

// Export services
export { ScraperService } from './services/scraper.service';
export { CacheService } from './services/cache.service';

// Export types
export * from './types';

// Package version
export const version = '0.1.0';