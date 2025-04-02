// src/CrawlerFactory.ts
import { WebCrawler, CrawlerConfig as WebCrawlerConfig } from './core/crawler';
import { JobParserService } from './core/parser';
import { ScraperService } from './services/scraper.service';
import { CacheService } from './services/cache.service';
import { Logger } from './utils/Logger';
import { AIService, UrlNormalizationService } from '@fedjobs/utils';

export class CrawlerFactory {
  static createScraperService(config: Partial<WebCrawlerConfig> = {}): ScraperService {
    const logger = new Logger('Crawler');
    const aiService = new AIService();
    const parser = new JobParserService(aiService, logger);
    const crawler = new WebCrawler(parser, logger, config);
    const cacheService = new CacheService();
    const urlNormalizer = (url: string) => new UrlNormalizationService().normalizeUrl(url);
    
    return new ScraperService(crawler, parser, cacheService, logger, urlNormalizer);
  }
}