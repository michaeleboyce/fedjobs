// File path: packages/crawler/src/core/crawler/WebCrawler.ts
import { PlaywrightCrawler, LogLevel, log } from 'crawlee';
import { URL } from 'url';
import { CrawlJobOptions, JobPostingData } from '../../types';
import { JobParserService } from '../parser';
import { UrlTracker } from './URLTracker';
import { PageHandler } from './PageHandler';
import { LinkDiscovery } from './LinkDiscovery';
import { JobProcessor } from './JobProcessor';
import { Logger } from '../../utils/Logger';

/**
 * Result from a crawl operation
 */
export interface CrawlResult {
  jobsFound: JobPostingData[];
  jobsStored: number[];
}

/**
 * WebCrawler - Orchestrates the crawling process using specialized components
 */
export class WebCrawler {
  private logger: Logger;
  private urlTracker: UrlTracker;
  private pageHandler: PageHandler;
  private linkDiscovery: LinkDiscovery;
  private jobProcessor: JobProcessor;
  private parser: JobParserService;
  
  // Map to store active crawlers by source ID
  private activeCrawlers = new Map<number, PlaywrightCrawler>();
  
  constructor(parser?: JobParserService) {
    log.setLevel(LogLevel.INFO);
    this.parser = parser || new JobParserService();
    
    // Initialize components
    this.logger = new Logger('WebCrawler');
    this.urlTracker = new UrlTracker();
    this.pageHandler = new PageHandler();
    this.linkDiscovery = new LinkDiscovery(this.parser);
    this.jobProcessor = new JobProcessor();
    
    this.logger.info('Initialized with PlaywrightCrawler from crawlee');
  }
  
  /**
   * Cancel an active crawler for a source
   */
  async cancelCrawler(sourceId: number): Promise<boolean> {
    const crawler = this.activeCrawlers.get(sourceId);
    if (!crawler) {
      this.logger.info(`No active crawler found for source ${sourceId}`);
      return false;
    }
    
    try {
      this.logger.info(`Cancelling crawler for source ${sourceId}`);
      await crawler.stop();
      this.activeCrawlers.delete(sourceId);
      this.logger.info(`Successfully cancelled crawler for source ${sourceId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error cancelling crawler for source ${sourceId}:`, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
  
  /**
   * Simplified interface for crawling a job site and processing jobs
   * 
   * @param options Crawl options
   * @param onProcessJob Function to process each found job
   * @returns Results of the crawl including jobs found and jobs stored
   */
  async crawlSite(
    options: {
      sourceId: number;
      url: string;
      keywords?: string;
      maxJobs?: number;
    },
    onProcessJob: (job: JobPostingData) => Promise<number>
  ): Promise<CrawlResult> {
    this.logger.info(`Starting crawl for source ${options.sourceId}, URL: ${options.url}`);
    
    const jobsFound: JobPostingData[] = [];
    const jobsStored: number[] = [];
    
    try {
      // Create crawl options
      const crawlOptions: CrawlJobOptions = {
        url: options.url,
        keywords: options.keywords,
        maxJobs: options.maxJobs || 50,
        sourceId: options.sourceId,
        
        // Callback when a job is found
        onJobFound: async (job) => {
          this.logger.job(job.title, job.organization || '');
          
          // Process the job with the provided callback
          const jobId = await onProcessJob(job);
          
          // Only track valid jobs (jobId > 0)
          if (jobId > 0) {
            jobsFound.push(job);
            jobsStored.push(jobId);
          } else {
            this.logger.info(`Skipping invalid job: ${job.title}`);
          }
        }
      };
      
      // Perform the crawl
      await this.crawlJobSite(crawlOptions);
      
      return { jobsFound, jobsStored };
    } catch (error) {
      this.logger.error(`Error in crawlSite:`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Original crawl method (now used internally)
   * @internal
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
    
    this.logger.info(`Starting crawlJobSite of ${url} with keywords: ${keywords || 'none'}`);
    
    // If there's an existing crawler for this source, stop it first
    if (sourceId) {
      const stopped = await this.cancelCrawler(sourceId);
      if (stopped) {
        this.logger.info(`Stopped existing crawler for source ${sourceId}`);
      }
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      this.logger.error(`Invalid URL: ${url}`, error instanceof Error ? error : new Error(String(error)));
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
        this.activeCrawlers.set(sourceId, crawler);
      }
      
      // Start the crawl
      await crawler.run([url]);
      
      // Call onComplete callback if provided
      if (onComplete) {
        await onComplete(results);
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Error running crawler:`, error instanceof Error ? error : new Error(String(error)));
      
      if (onError && error instanceof Error) {
        await onError(error, url);
      }
      
      throw error;
    } finally {
      // Always unregister the crawler
      if (sourceId) {
        this.activeCrawlers.delete(sourceId);
      }
    }
  }
  
  /**
   * Create a Playwright crawler with configured handlers
   * @private
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
      requestHandlerTimeoutSecs: 180,
      
      // Handle failures
      failedRequestHandler: async ({ request, error }) => {
        this.logger.error(`Request ${request.url} failed:`, error as Record<string, any>);
        if (onError) {
          await onError(error as Error, request.url);
        }
      },
      
      // Process each page
      requestHandler: async ({ request, page, enqueueLinks }) => {
        // Use enhanced navigation log for URL transitions
        this.logger.navigation(request.url);
        
        // Extract domain for site logging
        let domain = '';
        try {
          domain = new URL(request.url).hostname.replace('www.', '');
          // Log site entry with domain
          this.logger.site(domain);
        } catch (e) {
          domain = request.url.split('/')[2] || '';
        }
        
        // Skip if recently visited
        if (this.urlTracker.isRecentlyVisited(request.url)) {
          this.logger.info(`Skipping recently visited URL: ${request.url}`);
          return;
        }
        
        // Record this visit
        this.urlTracker.recordVisit(request.url);
        
        try {
          // Check if page is already closed
          if (page.isClosed?.()) {
            this.logger.warn(`Page already closed for URL: ${request.url}`);
            return;
          }
          
          // Step 1: Setup page
          this.logger.step(1, "Setting up page");
          await this.pageHandler.setupPage(page);
          
          // Check if page is still valid
          if (page.isClosed?.()) {
            this.logger.warn(`Page closed after setup for URL: ${request.url}`);
            return;
          }
          
          // Step 2: Extract page data
          this.logger.step(2, "Extracting page data");
          const { content, title, description } = await this.pageHandler.extractPageData(page);
          
          // Step 3: Parse jobs data
          this.logger.step(3, "Parsing job data");
          const jobData = await this.parser.parseJobsFromPage({
            url: request.url,
            content,
            title,
            description,
            keywords
          });
          
          this.logger.success(`Found ${jobData.length} jobs on ${request.url}`);
          
          // Step 4: Process found jobs
          if (jobData.length > 0) {
            this.logger.step(4, `Processing ${jobData.length} found jobs`);
            
            // Process each job with visual feedback
            for (const job of jobData) {
              this.logger.job(job.title, job.organization || domain);
            }
            
            // Process the jobs even if page is closed - we already have the data
            await this.jobProcessor.processJobData(jobData, results, maxJobs, onJobFound);
            
            // Stop if we've reached the job limit
            if (results.length >= maxJobs) {
              this.logger.success(`Reached maximum jobs limit (${maxJobs})`);
              const browser = page.context()?.browser();
              if (browser && !browser.isConnected()) {
                await browser.close().catch(() => {});
              }
              return;
            }
          }
          
          // Step 5: Find and enqueue more links - only if page is still available
          if (!page.isClosed?.()) {
            this.logger.step(5, "Discovering and enqueueing additional links");
            await this.linkDiscovery.findAndEnqueueLinks(
              page, 
              enqueueLinks, 
              request.url, 
              url, 
              this.urlTracker
            ).catch(err => {
              this.logger.error(`Error in link discovery:`, err instanceof Error ? err : new Error(String(err)));
            });
          } else {
            this.logger.warn(`Skipping link discovery for ${request.url} - page is closed`);
          }
        } catch (error) {
          this.logger.error(`Error processing page ${request.url}:`, error instanceof Error ? error : new Error(String(error)));
          if (onError) {
            await onError(error as Error, request.url);
          }
        }
      }
    });
  }
}