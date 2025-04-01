// packages/crawler/src/core/PlaywrightCrawler.ts
import {
  PlaywrightCrawler as CrawleePlaywrightCrawler,
  PlaywrightCrawlingContext,
  LogLevel,
  log
} from 'crawlee';
import { URL } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';

import { ICrawler } from '../interfaces/ICrawler';
import { IPageProcessor } from '../interfaces/IPageProcessor';
import { CrawlJobOptions, JobPostingData } from '../types';
import { CrawlerManager } from './CrawlerManager';
import { Logger } from '../utils/Logger';

const execAsync = promisify(exec);
const logger = new Logger('PlaywrightCrawler');

/**
 * Helper function to safely log errors with proper typing
 */
function logError(message: string, err: unknown): void {
  if (err instanceof Error) {
    logger.error(message, { 
      message: err.message, 
      stack: err.stack,
      name: err.name
    });
  } else if (typeof err === 'string') {
    logger.error(message, { details: err });
  } else {
    logger.error(message, { details: String(err) });
  }
}

/**
 * Helper function to safely log string data with proper typing
 */
function logData(message: string, data: string): void {
  logger.info(message, { data });
}

/**
 * Implementation of a web crawler using Playwright
 */
export class PlaywrightCrawler implements ICrawler {
  private urlHistory: Map<string, Date> = new Map();
  private readonly HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  private crawlerManager: CrawlerManager;
  private pageProcessor: IPageProcessor;
  private static playwrightCheckCompleted = false;
  
  constructor(
    pageProcessor: IPageProcessor,
    crawlerManager?: CrawlerManager
  ) {
    log.setLevel(LogLevel.INFO);
    this.pageProcessor = pageProcessor;
    this.crawlerManager = crawlerManager || CrawlerManager.getInstance();
    logger.info('Initialized with PlaywrightCrawler from crawlee');
  }
  
  private async checkPlaywrightDependencies(): Promise<void> {
    if (PlaywrightCrawler.playwrightCheckCompleted) {
      return;
    }
    
    try {
      logger.info('Checking Playwright dependencies...');
      
      // Create a minimal test crawler
      const testCrawler = new CrawleePlaywrightCrawler({
        launchContext: {
          launchOptions: {
            headless: true
          }
        },
        maxRequestsPerCrawl: 1,
        async requestHandler({ page }) {
          await page.goto('about:blank');
        }
      });
      
      await testCrawler.addRequests(['about:blank']);
      await testCrawler.run();
      
      logger.info('Playwright dependencies are properly installed');
      PlaywrightCrawler.playwrightCheckCompleted = true;
    } catch (error) {
      logError('Playwright dependency check failed', error);
      logger.info('Attempting to install Playwright dependencies...');
      
      try {
        const { stdout, stderr } = await execAsync('npx playwright install --with-deps');
        logData('Playwright install output', stdout);
        if (stderr) {
          logData('Playwright install stderr', stderr);
        }
        PlaywrightCrawler.playwrightCheckCompleted = true;
      } catch (installError) {
        logError('Failed to install Playwright dependencies', installError);
        throw new Error('Failed to install Playwright dependencies. Please run `npx playwright install --with-deps` manually.');
      }
    }
  }
  
  public async cancelCrawler(sourceId: number): Promise<boolean> {
    return this.crawlerManager.stopCrawler(sourceId);
  }
  
  private isRecentlyVisited(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const visitTime = this.urlHistory.get(normalizedUrl);
    if (!visitTime) return false;
    
    const now = new Date();
    return now.getTime() - visitTime.getTime() < this.HISTORY_EXPIRATION;
  }
  
  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.origin.toLowerCase() + 
             parsedUrl.pathname.replace(/\/$/, '').toLowerCase() + 
             parsedUrl.search;
    } catch (e) {
      return url.toLowerCase();
    }
  }
  
  private recordVisit(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);
    this.urlHistory.set(normalizedUrl, new Date());
  }
  
  async crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]> {
    const { 
      url, 
      keywords, 
      maxJobs = 50, 
      onJobFound, 
      onComplete, 
      onError, 
      sourceId 
    } = options;
    
    logger.info(`Starting crawl of ${url} with keywords: ${keywords || 'none'}`);
    
    try {
      await this.checkPlaywrightDependencies();
    } catch (error) {
      if (error instanceof Error && onError) {
        await onError(error, url);
      }
      throw error;
    }
    
    if (sourceId && this.crawlerManager.hasCrawler(sourceId)) {
      logger.info(`Found existing crawler for source ${sourceId}, stopping it first`);
      await this.crawlerManager.stopCrawler(sourceId);
    }
    
    const results: JobPostingData[] = [];
    
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      const errorMsg = `Invalid URL: ${url}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Create a crawler
    logger.info(`Creating PlaywrightCrawler for ${url}`);
    const crawler = new CrawleePlaywrightCrawler({
      headless: true,
      maxConcurrency: 2,
      navigationTimeoutSecs: 180,
      requestHandlerTimeoutSecs: 300,
      maxRequestsPerCrawl: 200,
      
      // Error handler
      failedRequestHandler: async ({ request, log, error }) => {
        logError(`Request ${request.url} failed`, error);
        if (onError && error instanceof Error) {
          await onError(error, request.url);
        }
      },
      
      // Main request handler
      requestHandler: async ({ request, page, enqueueLinks, log }) => {
        logger.info(`Processing: ${request.url}`);
        
        if (this.isRecentlyVisited(request.url)) {
          logger.info(`Skipping recently visited URL: ${request.url}`);
          return;
        }
        
        this.recordVisit(request.url);
        
        try {
          // Set up the page
          await this.pageProcessor.setupPage(page);
          
          // Get page data
          const pageData = await this.pageProcessor.extractPageData(page);
          
          // Find and enqueue links
          logger.info(`Finding and enqueueing links from ${request.url}`);
          
          // Use a custom wrapper for enqueueLinks to match our processor's signature
          const wrappedEnqueueLinks = async (options: {
            urls: string[];
            transformRequestFunction?: (req: any) => any | false;
          }) => {
            await enqueueLinks({
              urls: options.urls,
              transformRequestFunction: options.transformRequestFunction,
            });
          };
          
          const jobLinks = await this.pageProcessor.findAndEnqueueLinks(
            page, 
            wrappedEnqueueLinks,
            request.url, 
            url
          );
          
          // Process job page
          await this.processJobPage(
            request.url,
            pageData,
            jobLinks,
            options,
            results
          );
        } catch (error) {
          logError(`Error processing page ${request.url}`, error);
          if (error instanceof Error && onError) {
            await onError(error, request.url);
          }
        }
      }
    });
    
    try {
      // Store the crawler reference for possible cancellation
      if (sourceId) {
        this.crawlerManager.registerCrawler(sourceId, crawler);
      }
      
      // Start the crawl
      await crawler.run([url]);
      
      // Call onComplete callback if provided
      if (onComplete) {
        await onComplete(results);
      }
      
      // Remove the crawler reference
      if (sourceId) {
        this.crawlerManager.unregisterCrawler(sourceId);
      }
      
      return results;
    } catch (error) {
      logError(`Error running crawler`, error);
      
      if (sourceId) {
        this.crawlerManager.unregisterCrawler(sourceId);
      }
      
      if (error instanceof Error && onError) {
        await onError(error, url);
      }
      
      throw error;
    }
  }
  
  private async processJobPage(
    requestUrl: string,
    pageData: { content: string, title: string, description: string },
    jobLinks: string[],
    options: CrawlJobOptions,
    results: JobPostingData[]
  ): Promise<void> {
    const { keywords, maxJobs = 50, onJobFound } = options;
    
    const jobUrlPatterns = [
      /job/i, /position/i, /career/i, /opening/i, /vacancy/i, /apply/i
    ];
    const isLikelyJobUrl = jobUrlPatterns.some(pattern => pattern.test(requestUrl));
    logger.info(`URL analysis: ${isLikelyJobUrl ? 'Likely' : 'Possibly not'} a job page`);
    
    const isJobListingPage = /jobs?\/?$/i.test(requestUrl);
    const isJobDetailPage = /\/job(s)?\/[^\/]+$/i.test(requestUrl) || /\/careers?\/[^\/]+$/i.test(requestUrl);
    
    if (isJobListingPage && jobLinks.length > 0) {
      logger.info(`This appears to be a job listing page with ${jobLinks.length} job links`);
      return;
    }
    
    if (!isJobDetailPage && !isJobListingPage) {
      return;
    }
    
    try {
      // Placeholder for actual job parsing logic
      // This would interface with the parser service in a real implementation
    } catch (error) {
      logError(`Error processing job data`, error);
    }
  }
}