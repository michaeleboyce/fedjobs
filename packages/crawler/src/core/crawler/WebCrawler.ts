// packages/crawler/src/core/crawler/WebCrawler.ts
import { PlaywrightCrawler, LogLevel, log, RequestProvider } from 'crawlee';
import { URL } from 'url';
import { CrawlJobOptions, JobPostingData } from '../../types';
import { JobParserService } from '../parser';
import { UrlTracker } from './URLTracker';
import { PageHandler } from './PageHandler';
import { LinkDiscovery, PaginationLink } from './LinkDiscovery';
import { JobProcessor } from './JobProcessor';
import { Logger } from '../../utils/Logger';
import { createJobBoardService, JobBoardService } from '../../job-boards/job-board-service';
import { isKnownJobBoardDomain, KNOWN_JOB_BOARDS } from '../../job-boards/constants';

/**
 * Result from a crawl operation
 */
export interface CrawlResult {
  jobsFound: JobPostingData[];
  jobsStored: number[];
}

/**
 * WebCrawler - Orchestrates the crawling process using specialized components
 * Enhanced with job board detection and specialized parsing
 */
export class WebCrawler {
  private logger: Logger;
  private urlTracker: UrlTracker;
  private pageHandler: PageHandler;
  private linkDiscovery: LinkDiscovery;
  private jobProcessor: JobProcessor;
  private parser: JobParserService;
  private jobBoardService: JobBoardService;
  
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
    
    // Initialize job board service
    this.jobBoardService = createJobBoardService({ genericParser: this.parser });
    
    this.logger.info('WebCrawler initialized with job board support');
    this.logger.info(`Known job board domains: ${this.getKnownJobBoardDomains()}`);
  }
  
  /**
   * Get a list of known job board domains for logging
   * @private
   */
  private getKnownJobBoardDomains(): string {
    // Extract all domains from all job boards
    const allDomains = KNOWN_JOB_BOARDS.flatMap((board: { domains: string[] }) => board.domains);
    
    // Return a formatted string of all domains
    return allDomains.join(', ');
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
      forceRefresh?: boolean;
    },
    onProcessJob: (job: JobPostingData) => Promise<number>
  ): Promise<CrawlResult> {
    this.logger.info(`Starting crawl for source ${options.sourceId}, URL: ${options.url}, forceRefresh: ${!!options.forceRefresh}`);
    
    // Check if the URL is from a known job board
    const isJobBoardUrl = this.jobBoardService.isJobBoardUrl(options.url);
    if (isJobBoardUrl) {
      const boardName = this.jobBoardService.getJobBoardName(options.url) || 'unknown job board';
      this.logger.info(`Detected known job board: ${boardName} (${options.url})`);
    } else {
      this.logger.info(`URL is not from a known job board: ${options.url}`);
    }
    
    const jobsFound: JobPostingData[] = [];
    const jobsStored: number[] = [];
    
    try {
      // Create crawl options
      const crawlOptions: CrawlJobOptions = {
        url: options.url,
        keywords: options.keywords,
        maxJobs: options.maxJobs || 50,
        sourceId: options.sourceId,
        forceRefresh: options.forceRefresh,
        
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
      sourceId,
      forceRefresh = false // Add forceRefresh parameter with default value
    } = options;
    
    this.logger.info(`Starting crawlJobSite of ${url} with keywords: ${keywords || 'none'}, forceRefresh: ${forceRefresh}`);
    
    // Check if the URL is from a known job board
    const isJobBoardUrl = this.jobBoardService.isJobBoardUrl(url);
    if (isJobBoardUrl) {
      const boardName = this.jobBoardService.getJobBoardName(url) || 'unknown job board';
      this.logger.info(`Detected known job board: ${boardName} (${url})`);
    }
    
    // If there's an existing crawler for this source, stop it first
    if (sourceId) {
      const stopped = await this.cancelCrawler(sourceId);
      if (stopped) {
        this.logger.info(`Stopped existing crawler for source ${sourceId}`);
      }
    }
    
    // Reset URL tracker history if force refresh is enabled
    if (forceRefresh) {
      this.logger.info(`Force refresh enabled - clearing URL tracker history`);
      this.urlTracker.clearHistory();
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
      onError,
      forceRefresh
    });
    
    try {
      // Register crawler for possible cancellation
      if (sourceId) {
        this.activeCrawlers.set(sourceId, crawler);
      }
      
      // Debug log before starting crawler
      this.logger.info(`Starting crawler for URL: ${url}`);
      
      // Start the crawl
      const runResult = await crawler.run([url]);
      
      // Debug log after crawler finished
      this.logger.info(`Crawler finished. Stats: ${JSON.stringify({
        requestsFinished: runResult.requestsFinished,
        requestsFailed: runResult.requestsFailed,
        requestsTotal: runResult.requestsTotal,
        retryHistogram: runResult.retryHistogram,
        crawlerRuntimeMillis: runResult.crawlerRuntimeMillis
      })}`);
      if (runResult.requestsTotal === 0) {
        this.logger.warn(`No requests were processed. This might indicate an issue with the initial URL or request queue.`);
      }
      
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
   * Enhanced with job board support
   * @private
   */
  private createCrawler({
    url,
    keywords,
    maxJobs,
    results,
    onJobFound,
    onError,
    forceRefresh
  }: {
    url: string;
    keywords?: string;
    maxJobs: number;
    results: JobPostingData[];
    onJobFound?: (job: JobPostingData) => Promise<void>;
    onError?: (error: Error, url: string) => Promise<void>;
    forceRefresh?: boolean;
  }): PlaywrightCrawler {
    return new PlaywrightCrawler({
      useSessionPool: true,
      headless: true,
      maxConcurrency: 2,
      navigationTimeoutSecs: 120,
      requestHandlerTimeoutSecs: 240,
      
      // Handle failures
      failedRequestHandler: async ({ request, error }) => {
        this.logger.error(`Request ${request.url} failed:`, error as Record<string, any>);
        if (onError) {
          await onError(error as Error, request.url);
        }
      },
      
      // Process each page
      requestHandler: async ({ request, page, crawler }) => {
        // Get the request queue for explicit enqueuing
        const requestQueue = crawler.requestQueue;
        if (!requestQueue) {
          this.logger.error('No request queue available. Cannot continue crawling.');
          return;
        }

        // Use enhanced navigation log for URL transitions
        this.logger.navigation(request.url);
        
        // Check if this is a job board URL
        const isJobBoardUrl = request.userData?.isJobBoardUrl === true || this.jobBoardService.isJobBoardUrl(request.url);
        
        // Debug info about the request (especially important for pagination)
        const isPagination = request.userData?.isPagination === true;
        
        if (isJobBoardUrl) {
          const boardName = this.jobBoardService.getJobBoardName(request.url) || 'unknown job board';
          this.logger.info(`Processing ${isPagination ? 'PAGINATION' : 'REGULAR'} page from ${boardName}: ${request.url}`);
          this.logger.info(`Job board detection: ${boardName} (${request.url})`);
        } else {
          this.logger.info(`Processing ${isPagination ? 'PAGINATION' : 'REGULAR'} page: ${request.url}`);
          this.logger.info(`Not a known job board: ${request.url}`);
        }
        
        // Extract domain for site logging
        let domain = '';
        try {
          domain = new URL(request.url).hostname.replace('www.', '');
          // Log site entry with domain
          this.logger.site(domain);
          
          // Check if domain is a known job board
          if (isKnownJobBoardDomain(domain)) {
            this.logger.info(`Domain is a known job board: ${domain}`);
          }
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
          
          // Step 3: Parse jobs data - use job board service for known job boards
          let jobData: JobPostingData[] = [];
          
          if (isJobBoardUrl) {
            const boardName = this.jobBoardService.getJobBoardName(request.url) || 'unknown job board';
            this.logger.step(3, `Parsing job board data from ${boardName}`);
            this.logger.info(`Using specialized parser for job board: ${boardName}`);
            
            jobData = await this.jobBoardService.parseJobBoardPage({
              url: request.url,
              content,
              title,
              description,
              keywords
            });
            
            // Check for additional URLs to crawl from job boards
            const additionalUrls = this.jobBoardService.getAdditionalUrlsToCrawl(request.url);
            if (additionalUrls.length > 0) {
              this.logger.info(`Found ${additionalUrls.length} additional URLs to crawl from job board ${boardName}`);
              this.logger.info(`Additional URLs: ${additionalUrls.join(', ')}`);
              
              await requestQueue.addRequests(additionalUrls.map(url => ({
                url,
                userData: { isJobBoardUrl: true }
              })));
            }
          } else {
            // Regular parsing with the standard parser
            this.logger.step(3, "Parsing job data with standard parser");
            this.logger.info(`Using generic parser for non-job board URL: ${request.url}`);
            
            jobData = await this.parser.parseJobsFromPage({
              url: request.url,
              content,
              title,
              description,
              keywords
            });
          }
          
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
          
          // Step 5: Discover links - only if page is still available
          if (!page.isClosed?.()) {
            this.logger.step(5, "Discovering links for enqueueing");
            await this.discoverAndEnqueueLinks(page, requestQueue, request.url, url, isPagination);
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

  /**
   * Discover and enqueue links using the explicit RequestQueue API
   * Enhanced with job board link prioritization
   */
  private async discoverAndEnqueueLinks(
    page: any,
    requestQueue: RequestProvider,
    currentUrl: string,
    baseUrl: string,
    isCurrentPagePagination: boolean
  ): Promise<void> {
    try {
      this.logger.info(`Starting link discovery for ${currentUrl}`);

      // Extract links but don't enqueue them yet - separation of concerns
      const extractedLinks = await this.linkDiscovery.extractLinks(
        page,
        currentUrl,
        baseUrl,
        this.urlTracker
      );

      // Explicit logging of pagination links for debugging
      if (extractedLinks.paginationLinks.length > 0) {
        this.logger.info(`===== PAGINATION LINKS FOUND =====`);
        extractedLinks.paginationLinks.forEach((link, i) => {
          this.logger.info(`Pagination ${i+1}: ${link.text} -> ${link.href}`);
        });
        this.logger.info(`=================================`);
      } else {
        this.logger.info(`No pagination links found on this page`);
      }

      // Separate job board links from regular job links
      const jobBoardLinks: string[] = [];
      const regularJobLinks: string[] = [];
      
      this.logger.info(`Analyzing ${extractedLinks.jobLinks.length} job links for job board detection`);
      
      extractedLinks.jobLinks.forEach(url => {
        try {
          const urlObj = new URL(url);
          if (isKnownJobBoardDomain(urlObj.hostname)) {
            this.logger.info(`Detected job board link: ${url} (domain: ${urlObj.hostname})`);
            jobBoardLinks.push(url);
          } else {
            regularJobLinks.push(url);
          }
        } catch (e) {
          // If URL parsing fails, consider it a regular link
          this.logger.warn(`Failed to parse URL: ${url}`);
          regularJobLinks.push(url);
        }
      });
      
      if (jobBoardLinks.length > 0) {
        this.logger.info(`===== JOB BOARD LINKS FOUND =====`);
        jobBoardLinks.forEach((url, i) => {
          try {
            const urlObj = new URL(url);
            this.logger.info(`Job board ${i+1}: ${url} (domain: ${urlObj.hostname})`);
          } catch (e) {
            this.logger.info(`Job board ${i+1}: ${url}`);
          }
        });
        this.logger.info(`=================================`);
      } else {
        this.logger.info(`No job board links found on this page`);
      }
      
      // Create request objects for job board links with highest priority
      const jobBoardRequests = jobBoardLinks.map(url => {
        return {
          url,
          userData: {
            isJobBoardUrl: true,
            isJobLink: true,
            isPagination: false
          }
        };
      });

      // Create request objects for regular job links with high priority
      const jobLinkRequests = regularJobLinks.map(url => {
        return {
          url,
          userData: {
            isJobLink: true,
            isPagination: false
          }
        };
      });

      // Create request objects for pagination links with lower priority
      const paginationLinkRequests = extractedLinks.paginationLinks.map(link => {
        return {
          url: link.href,
          userData: {
            isPagination: true,
            isJobLink: false,
            linkText: link.text // Store the link text for better debugging
          }
        };
      });

      // Enqueue job board links first (highest priority)
      if (jobBoardRequests.length > 0) {
        this.logger.info(`Explicitly enqueueing ${jobBoardRequests.length} job board links to RequestQueue (highest priority)`);
        await requestQueue.addRequests(jobBoardRequests);
      }

      // Enqueue regular job links second (high priority)
      if (jobLinkRequests.length > 0) {
        this.logger.info(`Explicitly enqueueing ${jobLinkRequests.length} regular job links to RequestQueue (high priority)`);
        await requestQueue.addRequests(jobLinkRequests);
      }

      // Enqueue pagination links last (lowest priority)
      if (paginationLinkRequests.length > 0) {
        this.logger.info(`Explicitly enqueueing ${paginationLinkRequests.length} pagination links to RequestQueue (lowest priority)`);
        const result = await requestQueue.addRequests(paginationLinkRequests);
        // Detailed logging of pagination enqueuing result
        this.logger.info(`Pagination enqueue result: ${result.unprocessedRequests.length} unprocessed requests, ${result.processedRequests.length} processed requests`);
        
        if (result.unprocessedRequests.length > 0) {
          this.logger.info(`Successfully added pagination links:`);
          result.unprocessedRequests.forEach(req => {
            const linkText = JSON.stringify(req)|| 'Unknown';
            this.logger.info(`Pagination queued: "${linkText}" -> ${req.url}`);
          });
        }
      }

    } catch (error) {
      this.logger.error(`Error in link discovery and enqueueing:`, error instanceof Error ? error : new Error(String(error)));
    }
  }
}