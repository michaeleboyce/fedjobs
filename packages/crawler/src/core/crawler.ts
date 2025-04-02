// src/core/crawler.ts
import { PlaywrightCrawler, LogLevel as CrawleeLogLevel, log } from 'crawlee';
import { URL } from 'url';
import { CrawlJobOptions, JobPostingData, PageType, CrawlStrategy, LinkPriority, DetailedCrawlResult } from '../types';
import { ICrawler } from '../interfaces/ICrawler';
import { IParser } from '../interfaces/IParser';
import { ILogger } from '../interfaces/ILogger';
import { CrawlerError, ErrorCode } from '../utils/errors';

/**
 * Configuration interface for the WebCrawler.
 * Defines settings like concurrency, timeouts, and logging level.
 */
export interface CrawlerConfig {
  maxConcurrency: number; // Maximum number of concurrent browser instances
  navigationTimeoutSecs: number; // Maximum time allowed for page navigation
  historyExpirationMs: number; // How long to remember visited URLs (in milliseconds)
  requestQueueMaxSize: number; // Maximum number of URLs to keep in the queue
  maxRequestRetries: number; // Maximum number of times to retry a failed request
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none'; // Logging verbosity
  // New properties for advanced crawling
  defaultCrawlStrategy: CrawlStrategy; // Default crawling strategy
  enableDetailedResults: boolean; // Whether to collect detailed results
}

/**
 * Default configuration values for the WebCrawler.
 */
export const defaultCrawlerConfig: CrawlerConfig = {
  maxConcurrency: 2,
  navigationTimeoutSecs: 90,
  historyExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
  requestQueueMaxSize: 100,
  maxRequestRetries: 3,
  logLevel: 'info',
  // New default values for advanced crawling
  defaultCrawlStrategy: {
    maxDepth: 3,
    maxPagesPerDomain: 50,
    priorityThreshold: 4.0, // Minimum score (0-10) to follow a link
    includePatterns: [],
    excludePatterns: [
      /\.(jpg|jpeg|png|gif|css|js|pdf|doc|docx|xls|xlsx|zip|rar|exe)$/i,
      /\/login\/?$/i,
      /\/logout\/?$/i,
      /\/signin\/?$/i,
      /\/signup\/?$/i
    ],
    respectRobotsTxt: true,
    followRedirects: true,
    sameOriginOnly: true
  },
  enableDetailedResults: false
};

/**
 * WebCrawler class implements the ICrawler interface using Playwright and Crawlee.
 * It's responsible for navigating websites, extracting job postings, and managing the crawling process.
 */
export class WebCrawler implements ICrawler {
  // Stores recently visited URLs and their visit times to avoid redundant crawls.
  private urlHistory: Map<string, Date> = new Map();
  // Keeps track of active Crawlee instances, mapped by a source identifier.
  private activeCrawlers: Map<number, PlaywrightCrawler> = new Map();
  // Instance of a parser responsible for extracting job data from page content.
  private parser: IParser;
  // Instance of a logger for recording events and errors.
  private logger: ILogger;
  // Holds the final configuration settings for the crawler instance.
  private config: CrawlerConfig;
  // Add these properties to the WebCrawler class
  private crawlStrategy: CrawlStrategy;
  private detailedResults: Partial<DetailedCrawlResult> | null = null;
  private visitedPagesCount: Map<string, number> = new Map(); // Track pages per domain
  private crawlStartTime: number = 0;
  private linkPriorities: Map<string, LinkPriority> = new Map(); // Track link priorities
  
  /**
   * Initializes a new instance of the WebCrawler.
   * @param parser The parser implementation to use for extracting job data.
   * @param logger The logger implementation for recording messages.
   * @param config Optional partial configuration to override defaults.
   */
  constructor(
    parser: IParser, 
    logger: ILogger, 
    config: Partial<CrawlerConfig> = {}
  ) {
    this.parser = parser;
    this.logger = logger;
    // Merge default configuration with provided overrides
    this.config = { ...defaultCrawlerConfig, ...config };
    // Set the crawl strategy from config or default
    this.crawlStrategy = this.config.defaultCrawlStrategy;
    
    // Configure the underlying Crawlee library's log level based on the config
    this.configureLogLevel();
    
    this.logger.info('WebCrawler initialized with PlaywrightCrawler');
  }
  
  /**
   * Sets the log level for the internal Crawlee logger based on the configured level.
   */
  private configureLogLevel(): void {
    switch(this.config.logLevel) {
      case 'debug': log.setLevel(CrawleeLogLevel.DEBUG); break;
      case 'info': log.setLevel(CrawleeLogLevel.INFO); break;
      case 'warn': log.setLevel(CrawleeLogLevel.WARNING); break;
      case 'error': log.setLevel(CrawleeLogLevel.ERROR); break;
      case 'none': log.setLevel(CrawleeLogLevel.OFF); break;
    }
  }
  
  /**
   * Attempts to gracefully stop and remove an active crawler associated with a specific source ID.
   * This is useful for cancelling ongoing crawls.
   * @param sourceId The identifier of the source whose crawler should be cancelled.
   * @returns True if a crawler was found and successfully cancelled, false otherwise.
   * @throws {CrawlerError} If stopping the crawler fails.
   */
  public async cancelCrawler(sourceId: number): Promise<boolean> {
    // Retrieve the active crawler instance for the given source ID.
    const crawler = this.activeCrawlers.get(sourceId);
    // If no crawler is found for this source, log it and return false.
    if (!crawler) {
      this.logger.info(`No active crawler found for source ${sourceId}`);
      return false;
    }
    
    try {
      this.logger.info(`Cancelling crawler for source ${sourceId}`);
      // Attempt to stop the Crawlee instance.
      await crawler.stop();
      // Remove the crawler reference from the active map.
      this.activeCrawlers.delete(sourceId);
      this.logger.info(`Successfully cancelled crawler for source ${sourceId}`);
      return true;
    } catch (error) {
      // Log the error and re-throw a specific CrawlerError.
      this.logger.error(`Error cancelling crawler for source ${sourceId}`, { error });
      throw new CrawlerError(
        `Failed to cancel crawler for source ${sourceId}`,
        ErrorCode.CRAWLER_CANCELLATION_FAILED,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Checks if a given URL has been visited within the configured history expiration time.
   * Uses the normalized URL for comparison.
   * @param url The URL to check.
   * @returns True if the URL was visited recently, false otherwise.
   */
  private isRecentlyVisited(url: string): boolean {
    // Normalize the URL for consistent checking.
    const normalizedUrl = this.normalizeUrl(url);
    // Get the last visit time for this URL.
    const visitTime = this.urlHistory.get(normalizedUrl);
    // If it was never visited, return false.
    if (!visitTime) return false;
    
    // Calculate the time difference and compare with the expiration threshold.
    const now = new Date();
    return now.getTime() - visitTime.getTime() < this.config.historyExpirationMs;
  }
  
  /**
   * Normalizes a URL string to ensure consistent formatting for history tracking and comparison.
   * Converts to lowercase, removes trailing slashes from the pathname.
   * @param url The URL string to normalize.
   * @returns The normalized URL string.
   */
  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Combine origin, path (lowercase, no trailing slash), and search parameters.
      return parsedUrl.origin.toLowerCase() + 
             parsedUrl.pathname.replace(/\/$/, '').toLowerCase() + 
             parsedUrl.search;
    } catch (e) {
      // If URL parsing fails, just return the lowercase version as a fallback.
      return url.toLowerCase();
    }
  }
  
  /**
   * Records the current time as the last visit time for a given URL in the history map.
   * Uses the normalized URL as the key.
   * @param url The URL that was just visited.
   */
  private recordVisit(url: string): void {
    // Normalize the URL before storing.
    const normalizedUrl = this.normalizeUrl(url);
    // Store the current timestamp.
    this.urlHistory.set(normalizedUrl, new Date());
  }
  
  /**
   * The main method to initiate a crawl for a specific job site.
   * It configures and runs a PlaywrightCrawler instance based on the provided options.
   * @param options Configuration for this specific crawl job, including URL, keywords, limits, and callbacks.
   * @returns A promise that resolves with an array of extracted JobPostingData.
   * @throws {CrawlerError} If the initial URL is invalid or if the crawl fails fundamentally.
   */
  async crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]> {
    const { 
      url, // The starting URL for the crawl.
      keywords, // Optional keywords to filter jobs (used by the parser).
      maxJobs = 50, // Maximum number of job postings to collect.
      onJobFound, // Optional callback executed each time a new job is found.
      onComplete, // Optional callback executed when the crawl finishes successfully.
      onError, // Optional callback executed when an error occurs during crawling.
      sourceId // Optional identifier for the source, used for cancellation.
    } = options;
    
    this.logger.info(`Starting crawl of ${url} with keywords: ${keywords || 'none'}`);
    
    // Before starting a new crawl for a source, check if one is already running.
    // If so, cancel the existing one to prevent conflicts or redundant work.
    if (sourceId && this.activeCrawlers.has(sourceId)) {
      this.logger.info(`Found existing crawler for source ${sourceId}, stopping it first`);
      await this.cancelCrawler(sourceId);
    }
    
    // Array to store the collected job posting data.
    const results: JobPostingData[] = [];
    
    // Validate the starting URL. Throws if invalid.
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch (error) {
      throw new CrawlerError(
        `Invalid URL: ${url}`,
        ErrorCode.INVALID_ARGUMENTS,
        error instanceof Error ? error : undefined
      );
    }
    
    // Create and configure the PlaywrightCrawler instance from Crawlee.
    this.logger.info(`Creating PlaywrightCrawler for ${url}`);
    const crawler = new PlaywrightCrawler({
      // Use headless mode (no visible browser window). Set to false for debugging.
      headless: true, 
      // Control how many pages are processed concurrently.
      maxConcurrency: this.config.maxConcurrency,
      // Set the maximum time to wait for page navigation actions.
      navigationTimeoutSecs: this.config.navigationTimeoutSecs,
      // Configure how many times to retry a request if it fails.
      maxRequestRetries: this.config.maxRequestRetries,
      
      /**
       * Handles requests that failed after all retries.
       * Logs the error and calls the onError callback if provided.
       */
      failedRequestHandler: async ({ request, error }) => {
        this.logger.error(`Request ${request.url} failed:`, { error });
        if (onError) {
          // Pass the error and URL to the user-defined error handler.
          await onError(error as Error, request.url);
        }
      },
      
      /**
       * The core logic executed for each URL visited by the crawler.
       * It implements the 3-step intelligent crawling workflow:
       * 1. Classify the page (job listing, single job, unknown)
       * 2. Extract jobs based on the classification
       * 3. Prioritize and enqueue new links
       */
      requestHandler: async ({ request, page, enqueueLinks }) => {
        this.logger.info(`Processing: ${request.url}`);
        
        // Extract crawl depth from request userData or default to 0
        const currentDepth = request.userData.depth || 0;
        const domain = this.extractDomain(request.url);
        
        // Check visit constraints
        if (this.shouldSkipVisit(request.url, domain, currentDepth)) {
          this.logger.info(`Skipping URL due to constraints: ${request.url}`);
          return;
        }
        
        // Record this visit
        this.recordVisit(request.url);
        this.incrementDomainVisitCount(domain);
        
        // Track performance metrics if detailed results enabled
        const pageStartTime = Date.now();
        let parseStartTime = 0;
        
        try {
          // Prepare the Playwright page (viewport, wait times)
          await this.setupPage(page);
          
          // Extract relevant text content, title, and description from the page
          const { content, title, description } = await this.extractPageData(page);
          
          // STEP 1: Classify the page using AI
          parseStartTime = Date.now();
          this.logger.info(`Classifying page: ${request.url}`);
          
          const pageClassification = await this.parser.classifyPage({
            url: request.url,
            content,
            title,
            description,
            keywords: options.keywords
          });
          
          // Track classification in detailed results if enabled
          if (this.config.enableDetailedResults && this.detailedResults) {
            if (!this.detailedResults.pageClassifications) {
              this.detailedResults.pageClassifications = {};
            }
            this.detailedResults.pageClassifications[request.url] = pageClassification;
          }
          
          this.logger.info(`Page classified as ${pageClassification.pageType} with confidence ${pageClassification.confidence}`);
          
          // Extract jobs based on page classification
          let extractedJobs: JobPostingData[] = [];
          let jobLinks: string[] = [];
          
          // STEP 2: Process the page based on its classification
          if (pageClassification.pageType === PageType.JOB_LISTING) {
            // 2a. If it's a job listing page, extract all jobs and their links
            this.logger.info(`Processing job listing page: ${request.url}`);
            const listingResult = await this.parser.parseJobListingPage({
              url: request.url,
              content,
              title,
              description,
              keywords: options.keywords
            });
            
            extractedJobs = listingResult.jobs;
            jobLinks = listingResult.links;
            
            this.logger.info(`Found ${extractedJobs.length} jobs and ${jobLinks.length} job links on listing page`);
            
          } else if (pageClassification.pageType === PageType.SINGLE_JOB) {
            // 2b. If it's a single job page, extract the job details
            this.logger.info(`Processing single job page: ${request.url}`);
            const job = await this.parser.parseSingleJobPage({
              url: request.url,
              content,
              title,
              description,
              keywords: options.keywords
            });
            
            if (job) {
              extractedJobs = [job];
              this.logger.info(`Successfully extracted job: ${job.title} at ${job.organization}`);
            } else {
              this.logger.info(`No valid job data found on page: ${request.url}`);
            }
          }
          
          // Process any extracted jobs (add to results, call callbacks, etc.)
          if (extractedJobs.length > 0) {
            await this.processJobData(extractedJobs, results, maxJobs, onJobFound);
            
            // Track job URLs in detailed results if enabled
            if (this.config.enableDetailedResults && this.detailedResults) {
              this.detailedResults.jobUrlsFound = [
                ...(this.detailedResults.jobUrlsFound || []),
                request.url
              ];
            }
            
            // Check if the maximum desired number of jobs has been reached
            if (results.length >= maxJobs) {
              this.logger.info(`Reached maximum jobs limit (${maxJobs})`);
              await crawler.stop();
              return;
            }
          }
          
          // STEP 3: Extract and prioritize links for further crawling
          // First add any specific job links found in a job listing page
          if (jobLinks.length > 0) {
            this.logger.info(`Enqueueing ${jobLinks.length} job-specific links with high priority`);
            
            // Add job links with high priority and increased depth
            for (const link of jobLinks) {
              if (!this.shouldSkipLink(link)) {
                await enqueueLinks({
                  urls: [link],
                  userData: { 
                    depth: currentDepth + 1,
                    priority: 10, // Highest priority for job links
                    source: request.url
                  }
                });
              }
            }
          }
          
          // Then extract all links on the page and prioritize them
          const allLinks = await this.extractAllLinks(page);
          
          if (allLinks.href.length > 0) {
            // Analyze and prioritize links
            const { href: linkHrefs, text: linkTexts, title: linkTitles, aria: linkArias } = 
              this.formatLinksForAnalysis(allLinks);
            
            const prioritizationResult = await this.parser.prioritizeLinks({
              sourceUrl: request.url,
              pageTitle: title,
              links: linkHrefs.map((href, i) => ({
                href,
                text: linkTexts[i],
                title: linkTitles[i],
                aria: linkArias[i]
              }))
            });
            
            // Enqueue links based on priority score
            this.logger.info(`Found ${prioritizationResult.prioritizedLinks.length} prioritized links`);
            
            // Filter and enqueue links that meet the threshold
            const linksToCrawl = prioritizationResult.prioritizedLinks.filter(url => {
              const score = prioritizationResult.scores[url];
              return score >= this.crawlStrategy.priorityThreshold && !this.shouldSkipLink(url);
            });
            
            if (linksToCrawl.length > 0) {
              this.logger.info(`Enqueueing ${linksToCrawl.length} links that meet priority threshold`);
              
              for (const link of linksToCrawl) {
                const score = prioritizationResult.scores[link];
                await enqueueLinks({
                  urls: [link],
                  userData: { 
                    depth: currentDepth + 1,
                    priority: score, // Use the AI-assigned priority score
                    source: request.url
                  }
                });
                
                // Track link priorities if detailed results enabled
                if (this.config.enableDetailedResults) {
                  this.linkPriorities.set(link, {
                    url: link,
                    score,
                    reasons: [`Prioritized from ${request.url}`],
                    depth: currentDepth + 1
                  });
                }
              }
            }
          }
          
          // Update performance metrics
          if (this.config.enableDetailedResults && this.detailedResults) {
            const pageEndTime = Date.now();
            const parseTime = parseStartTime > 0 ? pageEndTime - parseStartTime : 0;
            const networkTime = parseStartTime - pageStartTime;
            
            if (!this.detailedResults.performance) {
              this.detailedResults.performance = {
                totalDuration: 0,
                averagePageTime: 0,
                parseTime: 0,
                networkTime: 0
              };
            }
            
            this.detailedResults.performance.parseTime += parseTime;
            this.detailedResults.performance.networkTime += networkTime;
          }
          
        } catch (error) {
          // Handle page processing errors
          this.logger.error(`Error processing page ${request.url}:`, { error });
          
          // Track failed URLs in detailed results
          if (this.config.enableDetailedResults && this.detailedResults) {
            if (!this.detailedResults.failedUrls) {
              this.detailedResults.failedUrls = {};
            }
            this.detailedResults.failedUrls[request.url] = error instanceof Error ? error.message : String(error);
          }
          
          // Create a structured CrawlerError with context
          const crawlerError = new CrawlerError(
            `Error processing page ${request.url}`,
            ErrorCode.CRAWLER_PAGE_PROCESSING_FAILED,
            error instanceof Error ? error : undefined,
            { url: request.url }
          );
          
          // Call the global onError callback if provided
          if (onError) {
            await onError(crawlerError, request.url);
          }
        }
      }
    });
    
    try {
      // Store a reference to the running crawler instance if a sourceId is provided.
      // This allows cancellation via the `cancelCrawler` method.
      if (sourceId) {
        this.activeCrawlers.set(sourceId, crawler);
      }
      
      // Start the crawl! This begins processing the initial URL(s).
      // The Promise resolves when the queue is empty or the crawl is stopped.
      this.logger.info(`Running crawler starting with URL: ${url}`);
      await crawler.run([url]);
      this.logger.info(`Crawler finished for URL: ${url}`);
      
      // Crawl completed successfully (or was stopped). Call the onComplete callback.
      if (onComplete) {
        await onComplete(results);
      }
      
      // Remove the crawler reference now that it's finished.
      if (sourceId) {
        this.activeCrawlers.delete(sourceId);
      }
      
      // Return the array of collected job postings.
      return results;
      
    } catch (error) {
      // Catch fatal errors during the crawler's run (e.g., setup issues, unhandled exceptions).
      this.logger.error(`Error running crawler:`, { error });
      
      // Ensure the crawler reference is removed even if an error occurred.
      if (sourceId) {
        this.activeCrawlers.delete(sourceId);
      }
      
      // Create a structured CrawlerError.
      const crawlerError = new CrawlerError(
        `Error running crawler for ${url}`,
        ErrorCode.CRAWLER_NAVIGATION_FAILED, // Or a more specific code if identifiable
        error instanceof Error ? error : undefined,
        { url } // Add context about the starting URL.
      );
      
      // Call the global onError callback if provided.
      if (onError && error instanceof Error) {
        await onError(crawlerError, url);
      }
      
      // Re-throw the structured error to signal failure to the caller.
      throw crawlerError;
    }
  }
  
  /**
   * Configures the Playwright page environment before processing.
   * Sets viewport size and includes waits for page loading states.
   * @param page The Playwright Page object provided by Crawlee.
   */
  private async setupPage(page: any): Promise<void> {
    // Set a consistent browser window size.
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Wait for the basic DOM structure to be ready.
    await page.waitForLoadState('domcontentloaded');
    // Add a small fixed delay to allow initial JavaScript execution.
    await page.waitForTimeout(2000); 
    
    try {
      // Wait until network activity has calmed down, suggesting dynamic content is loaded.
      // Use a timeout as this might never resolve on some pages.
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (e) {
      // If networkidle times out, log it but continue processing the page.
      this.logger.info(`NetworkIdle timeout for ${page.url()} - continuing anyway`);
    }
  }
  
  /**
   * Extracts key information (HTML content, title, meta description) from the loaded page.
   * @param page The Playwright Page object.
   * @returns An object containing the page's content, title, and description.
   */
  private async extractPageData(page: any): Promise<{ content: string, title: string, description: string }> {
    // Get the full HTML source of the page.
    const content = await page.content();
    
    // Get the text content of the <title> tag.
    const title = await page.title();
    
    // Attempt to extract the content of the meta description tag.
    let description = '';
    try {
      description = await page.evaluate(() => {
        // Find the <meta name="description"> element in the page's DOM.
        const metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
        // Return its content attribute, or an empty string if not found.
        return metaTag ? metaTag.getAttribute('content') || '' : '';
      });
    } catch (error) {
      // Log if there's an issue accessing the meta description, but don't fail.
      this.logger.info(`Error getting meta description for ${page.url()}:`, { error });
    }
    
    return { content, title, description };
  }
  
  /**
   * Processes an array of job postings found on a single page.
   * Checks for duplicates against already collected results, adds new jobs,
   * and triggers the onJobFound callback.
   * @param jobData Array of JobPostingData extracted from the current page.
   * @param results The main array holding all collected job postings for the crawl.
   * @param maxJobs The maximum number of jobs to collect in total.
   * @param onJobFound Optional callback to execute for each newly found, non-duplicate job.
   */
  private async processJobData(
    jobData: JobPostingData[], 
    results: JobPostingData[], 
    maxJobs: number,
    onJobFound?: (job: JobPostingData) => Promise<void>
  ): Promise<void> {
    // Iterate through the jobs found on the current page.
    for (const job of jobData) {
      // Stop processing if the overall job limit has already been reached.
      if (results.length >= maxJobs) {
        break; 
      }
      
      // Basic duplicate check: see if a job with the same URL and Title already exists.
      // More sophisticated checks might be needed depending on the site.
      const isDuplicate = results.some(existingJob => 
        existingJob.url === job.url && existingJob.title === job.title
      );
      
      // If it's not a duplicate:
      if (!isDuplicate) {
        // Add the new job to the main results array.
        results.push(job);
        this.logger.info(`Added job to results (${results.length}/${maxJobs}): ${job.title}`);
        
        // If an onJobFound callback is provided, execute it asynchronously.
        if (onJobFound) {
          try {
            await onJobFound(job);
          } catch (callbackError) {
            this.logger.error(`Error in onJobFound callback for job ${job.title}:`, { callbackError });
            // Decide if this error should stop the crawl or just be logged.
          }
        }
      } else {
        // Log if a duplicate is skipped.
        this.logger.info(`Skipping duplicate job: ${job.title}`);
      }
    }
  }
  
  /**
   * Extracts domain from a URL string, removing 'www.' prefix
   * @param url The URL to extract domain from
   * @returns The domain name
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      return domain;
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Increments the visit count for a specific domain
   * @param domain The domain name to track
   */
  private incrementDomainVisitCount(domain: string): void {
    const currentCount = this.visitedPagesCount.get(domain) || 0;
    this.visitedPagesCount.set(domain, currentCount + 1);
  }
  
  /**
   * Determines whether a URL should be skipped based on various constraints
   * @param url The URL to check
   * @param domain The domain of the URL
   * @param depth The current crawl depth
   * @returns True if the URL should be skipped, false otherwise
   */
  private shouldSkipVisit(url: string, domain: string, depth: number): boolean {
    // Check if URL was recently visited
    if (this.isRecentlyVisited(url)) {
      return true;
    }
    
    // Check if we've reached the maximum crawl depth
    if (depth > this.crawlStrategy.maxDepth) {
      this.logger.info(`Skipping ${url}: maximum depth ${this.crawlStrategy.maxDepth} reached`);
      return true;
    }
    
    // Check if we've reached the maximum pages per domain
    const domainVisitCount = this.visitedPagesCount.get(domain) || 0;
    if (domainVisitCount >= this.crawlStrategy.maxPagesPerDomain) {
      this.logger.info(`Skipping ${url}: maximum pages per domain (${this.crawlStrategy.maxPagesPerDomain}) reached for ${domain}`);
      return true;
    }
    
    // Check if the URL should be excluded based on patterns
    if (this.shouldSkipLink(url)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Extracts all links from a page
   * @param page Playwright page object
   * @returns Object containing arrays of link properties
   */
  private async extractAllLinks(page: any): Promise<{
    href: string[];
    text: string[];
    title: string[];
    aria: string[];
  }> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const result = {
        href: [] as string[],
        text: [] as string[],
        title: [] as string[],
        aria: [] as string[]
      };
      
      links.forEach((link) => {
        const a = link as HTMLAnchorElement;
        if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
          result.href.push(a.href);
          result.text.push(a.textContent?.trim() || '');
          result.title.push(a.title || '');
          result.aria.push(a.getAttribute('aria-label') || '');
        }
      });
      
      return result;
    });
  }
  
  /**
   * Formats links for analysis by filtering out duplicates and invalid URLs
   * @param links Object containing arrays of link properties
   * @returns Filtered and deduplicated link properties
   */
  private formatLinksForAnalysis(links: {
    href: string[];
    text: string[];
    title: string[];
    aria: string[];
  }): {
    href: string[];
    text: string[];
    title: string[];
    aria: string[];
  } {
    // Create a Set to track unique URLs
    const uniqueUrls = new Set<string>();
    const result = {
      href: [] as string[],
      text: [] as string[],
      title: [] as string[],
      aria: [] as string[]
    };
    
    // Filter and deduplicate links
    for (let i = 0; i < links.href.length; i++) {
      const url = links.href[i];
      
      // Skip invalid or already seen URLs
      if (!url || this.shouldSkipLink(url) || uniqueUrls.has(url)) {
        continue;
      }
      
      // Add to results
      uniqueUrls.add(url);
      result.href.push(url);
      result.text.push(links.text[i]);
      result.title.push(links.title[i]);
      result.aria.push(links.aria[i]);
    }
    
    return result;
  }
  
  /**
   * Updates the shouldSkipLink method to handle more exclusion cases
   */
  private shouldSkipLink(url: string): boolean {
    // Skip non-HTTP URLs
    if (!url.startsWith('http')) {
      return true;
    }
    
    try {
      const parsedUrl = new URL(url);
      
      // Check if the URL is from a different origin when sameOriginOnly is true
      if (this.crawlStrategy.sameOriginOnly) {
        // TODO: Compare with the initial base URL origin
      }
      
      // Check exclude patterns
      for (const pattern of this.crawlStrategy.excludePatterns) {
        if (pattern.test(url)) {
          return true;
        }
      }
      
      // Check include patterns (if any are specified, URL must match at least one)
      if (this.crawlStrategy.includePatterns.length > 0) {
        const matchesInclude = this.crawlStrategy.includePatterns.some(pattern => 
          pattern.test(url)
        );
        if (!matchesInclude) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      // Invalid URL
      return true;
    }
  }
}