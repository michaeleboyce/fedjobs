// File path: packages/crawler/src/core/crawler/WebCrawler.ts
import { PlaywrightCrawler, LogLevel, log } from 'crawlee';
import { URL } from 'url';
import { CrawlJobOptions, JobPostingData } from '../../types';
import { JobParserService } from '../parser';
import { UrlTracker } from './URLTracker';
import { PageHandler } from './PageHandler';
import { LinkDiscovery } from './LinkDiscovery';
import { JobProcessor } from './JobProcessor';
import { CrawlerManager } from './CrawlerManager';

/**
 * WebCrawler - Orchestrates the crawling process using specialized components
 */
export class WebCrawler {
  private urlTracker: UrlTracker;
  private pageHandler: PageHandler;
  private linkDiscovery: LinkDiscovery;
  private jobProcessor: JobProcessor;
  private crawlerManager: CrawlerManager;
  private parser: JobParserService;
  
  constructor(parser?: JobParserService) {
    log.setLevel(LogLevel.INFO);
    this.parser = parser || new JobParserService();
    
    // Initialize components
    this.urlTracker = new UrlTracker();
    this.pageHandler = new PageHandler();
    this.linkDiscovery = new LinkDiscovery(this.parser);
    this.jobProcessor = new JobProcessor();
    this.crawlerManager = new CrawlerManager();
    
    console.log('[WebCrawler] Initialized with PlaywrightCrawler from crawlee');
  }
  
  /**
   * Cancel an active crawler for a source
   */
  public async cancelCrawler(sourceId: number): Promise<boolean> {
    return this.crawlerManager.cancelCrawler(sourceId);
  }
  
  /**
   * Crawl a job site and extract job postings
   */
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
    
    console.log(`[WebCrawler] Starting crawl of ${url} with keywords: ${keywords || 'none'}`);
    
    // If there's an existing crawler for this source, stop it first
    if (sourceId) {
      const stopped = await this.crawlerManager.cancelCrawler(sourceId);
      if (stopped) {
        console.log(`[WebCrawler] Stopped existing crawler for source ${sourceId}`);
      }
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      console.error(`[WebCrawler] Invalid URL: ${url}`, error);
      throw new Error(`Invalid URL: ${url}`);
    }
    
    const results: JobPostingData[] = [];
    
    // Create a crawler configuration
    const crawler = this.createCrawler({
      url,
      keywords,
      maxJobs,
      results,
      onJobFound,
      onError
    });
    
    try {
      // Register crawler for possible cancellation
      if (sourceId) {
        this.crawlerManager.registerCrawler(sourceId, crawler);
      }
      
      // Start the crawl
      await crawler.run([url]);
      
      // Call onComplete callback if provided
      if (onComplete) {
        await onComplete(results);
      }
      
      return results;
    } catch (error) {
      console.error(`[WebCrawler] Error running crawler:`, error);
      
      if (onError && error instanceof Error) {
        await onError(error, url);
      }
      
      throw error;
    } finally {
      // Always unregister the crawler
      if (sourceId) {
        this.crawlerManager.unregisterCrawler(sourceId);
      }
    }
  }
  
  /**
   * Create a Playwright crawler with configured handlers
   */
  private createCrawler({
    url,
    keywords,
    maxJobs,
    results,
    onJobFound,
    onError
  }: {
    url: string;
    keywords?: string;
    maxJobs: number;
    results: JobPostingData[];
    onJobFound?: (job: JobPostingData) => Promise<void>;
    onError?: (error: Error, url: string) => Promise<void>;
  }): PlaywrightCrawler {
    return new PlaywrightCrawler({
      headless: true,
      maxConcurrency: 2,
      navigationTimeoutSecs: 90,
      
      // Handle failures
      failedRequestHandler: async ({ request, error }) => {
        console.error(`[WebCrawler] Request ${request.url} failed:`, error);
        if (onError) {
          await onError(error as Error, request.url);
        }
      },
      
      // Process each page
      requestHandler: async ({ request, page, enqueueLinks }) => {
        console.log(`[WebCrawler] Processing: ${request.url}`);
        
        // Skip if recently visited
        if (this.urlTracker.isRecentlyVisited(request.url)) {
          console.log(`[WebCrawler] Skipping recently visited URL: ${request.url}`);
          return;
        }
        
        // Record this visit
        this.urlTracker.recordVisit(request.url);
        
        try {
          // Step 1: Setup page
          await this.pageHandler.setupPage(page);
          
          // Step 2: Extract page data
          const { content, title, description } = await this.pageHandler.extractPageData(page);
          
          // Step 3: Parse jobs data
          console.log(`[WebCrawler] Parsing job data from ${request.url}`);
          const jobData = await this.parser.parseJobsFromPage({
            url: request.url,
            content,
            title,
            description,
            keywords
          });
          
          console.log(`[WebCrawler] Found ${jobData.length} jobs on ${request.url}`);
          
          // Step 4: Process found jobs
          if (jobData.length > 0) {
            await this.jobProcessor.processJobData(jobData, results, maxJobs, onJobFound);
            
            // Stop if we've reached the job limit
            if (results.length >= maxJobs) {
              console.log(`[WebCrawler] Reached maximum jobs limit (${maxJobs})`);
              const browser = page.context()?.browser();
              if (browser) {
                await browser.close();
              }
              return;
            }
          }
          
          // Step 5: Find and enqueue more links
          await this.linkDiscovery.findAndEnqueueLinks(
            page, 
            enqueueLinks, 
            request.url, 
            url, 
            this.urlTracker
          );
          
        } catch (error) {
          console.error(`[WebCrawler] Error processing page ${request.url}:`, error);
          if (onError) {
            await onError(error as Error, request.url);
          }
        }
      }
    });
  }
}