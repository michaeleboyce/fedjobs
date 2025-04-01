// File path: packages/crawler/src/core/crawler.ts
import { PlaywrightCrawler, LogLevel, log } from 'crawlee';
import { URL } from 'url';
import { CrawlHistoryEntry, CrawlJobOptions, JobPostingData } from '../types';
import { JobParserService } from './parser';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class WebCrawler {
  private urlHistory: Map<string, Date> = new Map();
  private readonly HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  private activeCrawlers: Map<number, PlaywrightCrawler> = new Map();
  private parser: JobParserService;
  private static playwrightCheckCompleted = false;
  
  constructor(parser?: JobParserService) {
    log.setLevel(LogLevel.INFO);
    this.parser = parser || new JobParserService();
    console.log('[WebCrawler] Initialized with PlaywrightCrawler from crawlee');
  }
  
  /**
   * Checks if Playwright dependencies are installed and installs them if needed
   */
  private async checkPlaywrightDependencies(): Promise<void> {
    if (WebCrawler.playwrightCheckCompleted) {
      return;
    }
    
    try {
      console.log('[WebCrawler] Checking Playwright dependencies...');
      
      // Create a minimal test crawler using the correct Crawlee API
      const testCrawler = new PlaywrightCrawler({
        // Configure Playwright launch options
        launchContext: {
          launchOptions: {
            headless: true
          }
        },
        // Set minimal crawl options
        maxRequestsPerCrawl: 1,
        // Minimal request handler
        async requestHandler({ page, log }) {
          log.info('Playwright dependencies are working correctly');
          // Just load the blank page and exit
          await page.goto('about:blank');
        },
        // Handle failures
        failedRequestHandler({ log }) {
          log.error('Playwright dependency test failed');
        }
      });
      
      // Test with a simple blank page request
      await testCrawler.addRequests(['about:blank']);
      // Run the crawler but stop after the first request
      await testCrawler.run();
      
      console.log('[WebCrawler] Playwright dependencies are properly installed');
      WebCrawler.playwrightCheckCompleted = true;
    } catch (error) {
      console.error('[WebCrawler] Playwright dependency check failed:', error);
      console.log('[WebCrawler] Attempting to install Playwright dependencies...');
      
      try {
        console.log('[WebCrawler] Running: npx playwright install --with-deps');
        const { stdout, stderr } = await execAsync('npx playwright install --with-deps');
        console.log('[WebCrawler] Playwright install output:', stdout);
        if (stderr) {
          console.error('[WebCrawler] Playwright install stderr:', stderr);
        }
        console.log('[WebCrawler] Playwright dependencies installed successfully');
        WebCrawler.playwrightCheckCompleted = true;
      } catch (installError) {
        console.error('[WebCrawler] Failed to install Playwright dependencies:', installError);
        throw new Error('Failed to install Playwright dependencies. Please run `npx playwright install --with-deps` manually.');
      }
    }
  }
  
  /**
   * Cancel an active crawler for a source
   */
  public async cancelCrawler(sourceId: number): Promise<boolean> {
    const crawler = this.activeCrawlers.get(sourceId);
    if (!crawler) {
      console.log(`[WebCrawler] No active crawler found for source ${sourceId}`);
      return false;
    }
    
    try {
      console.log(`[WebCrawler] Cancelling crawler for source ${sourceId}`);
      await crawler.stop();
      this.activeCrawlers.delete(sourceId);
      console.log(`[WebCrawler] Successfully cancelled crawler for source ${sourceId}`);
      return true;
    } catch (error) {
      console.error(`[WebCrawler] Error cancelling crawler for source ${sourceId}:`, error);
      return false;
    }
  }
  
  /**
   * Check if URL was recently visited
   */
  private isRecentlyVisited(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const visitTime = this.urlHistory.get(normalizedUrl);
    if (!visitTime) return false;
    
    const now = new Date();
    return now.getTime() - visitTime.getTime() < this.HISTORY_EXPIRATION;
  }
  
  /**
   * Normalize a URL for consistent comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Remove trailing slashes and make lowercase
      return parsedUrl.origin.toLowerCase() + 
             parsedUrl.pathname.replace(/\/$/, '').toLowerCase() + 
             parsedUrl.search;
    } catch (e) {
      return url.toLowerCase();
    }
  }
  
  /**
   * Record URL visit
   */
  private recordVisit(url: string): void {
    const normalizedUrl = this.normalizeUrl(url);
    this.urlHistory.set(normalizedUrl, new Date());
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
    
    // Check and install Playwright dependencies if needed
    try {
      await this.checkPlaywrightDependencies();
    } catch (error) {
      console.error(`[WebCrawler] Playwright dependency check failed:`, error);
      if (onError) {
        await onError(error as Error, url);
      }
      throw error;
    }
    
    // If there's an existing crawler for this source, stop it first
    if (sourceId && this.activeCrawlers.has(sourceId)) {
      console.log(`[WebCrawler] Found existing crawler for source ${sourceId}, stopping it first`);
      await this.cancelCrawler(sourceId);
    }
    
    const results: JobPostingData[] = [];
    
    // Validate URL
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch (error) {
      console.error(`[WebCrawler] Invalid URL: ${url}`, error);
      throw new Error(`Invalid URL: ${url}`);
    }
    
    // Create a crawler
    console.log(`[WebCrawler] Creating PlaywrightCrawler for ${url}`);
    const crawler = new PlaywrightCrawler({
      // Use headless browser to handle JavaScript-heavy sites
      headless: true,
      // Limit concurrent requests
      maxConcurrency: 2,
      // More time for pages to load (3 minutes)
      navigationTimeoutSecs: 180,
      // Increase request handler timeout to allow for longer processing (5 minutes)
      requestHandlerTimeoutSecs: 300,
      // Start with a higher max request limit for job boards
      maxRequestsPerCrawl: 200,
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
        if (this.isRecentlyVisited(request.url)) {
          console.log(`[WebCrawler] Skipping recently visited URL: ${request.url}`);
          return;
        }
        
        // Record this visit
        this.recordVisit(request.url);
        
        try {
          // Setup page
          await this.setupPage(page);
          
          // Get page data
          const { content, title, description } = await this.extractPageData(page);
          
          // First find and enqueue links to ensure we don't miss job detail pages
          // This is critical for job boards that list job titles on the main page but details on separate pages
          console.log(`[WebCrawler] Finding and enqueueing links from ${request.url} before processing page content`);
          const jobLinks = await this.findAndEnqueueLinks(page, enqueueLinks, request.url, url);
          
          // Parse jobs data
          console.log(`[WebCrawler] Parsing job data from ${request.url}`);
          console.log(`[WebCrawler] Page title: "${title}"`);
          
          // Check if this URL looks like it could be a job page
          const jobUrlPatterns = [
            /job/i, /position/i, /career/i, /opening/i, /vacancy/i, /apply/i
          ];
          const isLikelyJobUrl = jobUrlPatterns.some(pattern => pattern.test(request.url));
          console.log(`[WebCrawler] URL analysis: ${isLikelyJobUrl ? 'Likely' : 'Possibly not'} a job page`);
          
          // Special processing for job listing pages vs. job detail pages
          // If the URL has "jobs" but not a specific job ID, it's likely a listing page
          const isJobListingPage = /jobs?\/?$/i.test(request.url);
          const isJobDetailPage = /\/job(s)?\/[^\/]+$/i.test(request.url) || /\/careers?\/[^\/]+$/i.test(request.url);
          
          if (isJobListingPage && jobLinks.length > 0) {
            console.log(`[WebCrawler] This appears to be a job listing page with ${jobLinks.length} job links`);
            console.log(`[WebCrawler] The crawler can handle up to 200 job links`);
            
            // Skip further processing since we're on a listing page - we only want to follow links
            console.log(`[WebCrawler] Skipping job parsing on listing page - we'll extract details from individual job pages instead`);
            return;
          }
          
          // Only parse job details on detail pages or pages that don't look like listing pages
          if (isJobDetailPage || !isJobListingPage) {
            console.log(`[WebCrawler] This appears to be a job detail page or standalone page - extracting job data`);
            
            const jobData = await this.parser.parseJobsFromPage({
              url: request.url,
              content,
              title,
              description,
              keywords
            });
            
            if (jobData.length === 0) {
              console.log(`[WebCrawler] No jobs found on ${request.url} - ${isLikelyJobUrl ? 'This is suspicious as URL looks like a job page' : 'URL doesn\'t look like a job page anyway'}`);
            } else {
              console.log(`[WebCrawler] Found ${jobData.length} jobs on ${request.url}`);
              // Log a summary of each job
              jobData.forEach((job, index) => {
                console.log(`[WebCrawler] Job #${index+1}: "${job.title}" at ${job.organization}, description length: ${job.description.length} chars`);
              });
            }
            
            // Process found jobs
            if (jobData.length > 0) {
              await this.processJobData(jobData, results, maxJobs, onJobFound);
              
              // Stop if we've reached the job limit
              if (results.length >= maxJobs) {
                console.log(`[WebCrawler] Reached maximum jobs limit (${maxJobs})`);
                await crawler.stop();
                return;
              }
            }
          } else {
            console.log(`[WebCrawler] Skipping job parsing on this page - not a job detail page`);
          }
          
        } catch (error) {
          console.error(`[WebCrawler] Error processing page ${request.url}:`, error);
          if (onError) {
            await onError(error as Error, request.url);
          }
        }
      }
    });
    
    try {
      // Store the crawler reference for possible cancellation
      if (sourceId) {
        this.activeCrawlers.set(sourceId, crawler);
      }
      
      // Start the crawl
      await crawler.run([url]);
      
      // Call onComplete callback if provided
      if (onComplete) {
        await onComplete(results);
      }
      
      // Remove the crawler reference
      if (sourceId) {
        this.activeCrawlers.delete(sourceId);
      }
      
      return results;
    } catch (error) {
      console.error(`[WebCrawler] Error running crawler:`, error);
      
      // Remove the crawler reference
      if (sourceId) {
        this.activeCrawlers.delete(sourceId);
      }
      
      if (onError && error instanceof Error) {
        await onError(error, url);
      }
      
      throw error;
    }
  }
  
  /**
   * Setup the page for crawling
   */
  private async setupPage(page: any): Promise<void> {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give JS some time to execute
    
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (e) {
      // Continue anyway if networkidle times out
      console.log(`[WebCrawler] NetworkIdle timeout - continuing anyway`);
    }
  }
  
  /**
   * Extract data from the page
   */
  private async extractPageData(page: any): Promise<{ content: string, title: string, description: string }> {
    // Get page content
    const content = await page.content();
    
    // Get title
    const title = await page.title();
    
    // Get meta description
    let description = '';
    try {
      description = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
        return metaTag ? metaTag.getAttribute('content') || '' : '';
      });
    } catch (error) {
      console.log(`[WebCrawler] Error getting meta description:`, error);
    }
    
    return { content, title, description };
  }
  
  /**
   * Process job data found on a page
   * This method:
   * 1. Checks if we've reached the maximum jobs limit
   * 2. Validates each job by checking for duplicates (based on URL and title)
   * 3. Adds valid jobs to the results array
   * 4. Triggers the onJobFound callback for each valid job
   * 
   * In the API integration:
   * - The API passes an onJobFound callback when refreshing job sources
   * - When a job is found, the API receives it via this callback
   * - The API then sends real-time updates to users via WebSockets
   * - This enables live progress updates in the UI as jobs are discovered
   * - The API also handles storing jobs in the database and updating job source status
   */
  private async processJobData(
    jobData: JobPostingData[], 
    results: JobPostingData[], 
    maxJobs: number,
    onJobFound?: (job: JobPostingData) => Promise<void>
  ): Promise<void> {
    for (const job of jobData) {
      // Skip if we've already found enough jobs
      if (results.length >= maxJobs) {
        console.log(`[WebCrawler] Max jobs limit (${maxJobs}) reached, skipping remaining jobs`);
        break;
      }
      
      // Check for duplicates based on URL and title
      const isDuplicate = results.some(existingJob => 
        existingJob.url === job.url && existingJob.title === job.title
      );
      
      if (!isDuplicate) {
        // Add to results
        results.push(job);
        console.log(`[WebCrawler] Added job to results: "${job.title}" at ${job.organization}`);
        console.log(`[WebCrawler] Job details: URL=${job.url}, desc_length=${job.description.length}`);
        
        // Call onJobFound callback if provided
        if (onJobFound) {
          try {
            console.log(`[WebCrawler] Calling onJobFound handler for job: "${job.title}"`);
            await onJobFound(job);
            console.log(`[WebCrawler] Successfully processed job: "${job.title}"`);
          } catch (error) {
            console.error(`[WebCrawler] Error in onJobFound callback for job "${job.title}":`, error);
            // Continue processing other jobs even if one fails
          }
        }
      } else {
        console.log(`[WebCrawler] Skipping duplicate job: "${job.title}" at ${job.organization}`);
      }
    }
  }
  
  /**
   * Find and enqueue additional links for crawling
   * @returns Array of job-related links that were found and enqueued
   */
  private async findAndEnqueueLinks(
    page: any, 
    enqueueLinks: any, 
    currentUrl: string,
    baseUrl: string
  ): Promise<string[]> {
    try {
      // First handle pagination links
      const paginationLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll(
          'a[href*="page="], .pagination a, [aria-label*="Next"], [aria-label*="Page"]'
        ));
        
        return links.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || '',
          isPagination: true
        }));
      });
      
      if (paginationLinks.length > 0) {
        console.log(`[WebCrawler] Found ${paginationLinks.length} pagination links`);
        
        // Enqueue pagination links with high priority
        await enqueueLinks({
          urls: paginationLinks.map((link: { href: string }) => link.href),
          transformRequestFunction: (req: any) => {
            req.userData = { ...(req.userData || {}), isPagination: true, priority: 3 };
            return req;
          }
        });
      }
      
      // Get all links on the page
      const links = await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a'));
        
        return allLinks.map(a => {
          return {
            href: (a as HTMLAnchorElement).href,
            text: a.textContent?.trim() || '',
            title: a.getAttribute('title') || '',
            aria: a.getAttribute('aria-label') || ''
          };
        }).filter(link => 
          link.href && 
          (link.href.startsWith('http://') || link.href.startsWith('https://'))
        );
      });
      
      // Debug: Log all links we found on the page
      console.log(`[WebCrawler] Found ${links.length} total links on the page`);
      if (links.length > 0 && links.length <= 20) {
        // Log all links if there are 20 or fewer
        links.forEach((link: any, i: number) => {
          console.log(`[WebCrawler] Link #${i+1}: ${link.text} → ${link.href}`);
        });
      } else if (links.length > 20) {
        // Log sample of links if there are more than 20
        console.log(`[WebCrawler] Link sample (first 10):`);
        links.slice(0, 10).forEach((link: any, i: number) => {
          console.log(`[WebCrawler] Link #${i+1}: ${link.text} → ${link.href}`);
        });
      }
      
      // Filter out invalid or non-HTTP links
      const validLinks = links.filter((link: { href: string }) => 
        link.href !== currentUrl && // Skip self-links
        !this.isRecentlyVisited(link.href) && // Skip recently visited links
        !this.shouldSkipLink(link.href) // Skip links matching patterns to ignore
      );
      
      console.log(`[WebCrawler] ${validLinks.length} links remain after filtering`);
      
      // Look for "Apply" links directly on the page - these are high priority job detail links
      const applyLinks = validLinks.filter((link: any) => {
        const hasApplyText = /apply|application|job details/i.test(link.text);
        const hasApplyAttr = /apply|application|job details/i.test(link.title) || 
                             /apply|application|job details/i.test(link.aria);
        return hasApplyText || hasApplyAttr;
      });
      
      if (applyLinks.length > 0) {
        console.log(`[WebCrawler] Found ${applyLinks.length} direct "Apply" links - these are likely job detail pages`);
        await enqueueLinks({
          urls: applyLinks.map((link: any) => link.href),
          transformRequestFunction: (req: any) => {
            req.userData = { ...req.userData, isApplyLink: true, priority: 4 };
            return req;
          }
        });
      }
      
      // Analyze remaining links to prioritize those that likely contain job listings
      const jobLinks = await this.parser.analyzeLinks({
        sourceUrl: baseUrl,
        pageTitle: await page.title(),
        links: validLinks
      });
      
      if (jobLinks.length > 0) {
        console.log(`[WebCrawler] Enqueueing ${jobLinks.length} job-related links`);
        
        // Debug output for job links
        jobLinks.forEach((link, i) => {
          console.log(`[WebCrawler] Job link #${i+1}: ${link}`);
        });
        
        await enqueueLinks({
          urls: jobLinks,
          transformRequestFunction: (req: any) => {
            req.userData = { ...req.userData, isJobLink: true, priority: 2 };
            return req;
          }
        });
      }
      
      // Return a combined set of all job-related links
      return [...(applyLinks || []).map((l: any) => l.href), ...jobLinks];
    } catch (error) {
      console.error(`[WebCrawler] Error finding links:`, error);
      return [];
    }
  }
  
  /**
   * Check if a link should be skipped
   */
  private shouldSkipLink(url: string): boolean {
    // Skip certain file types
    if (/\.(jpg|jpeg|png|gif|svg|css|js|pdf|doc|xls|ppt)$/i.test(url)) {
      return true;
    }
    
    // Skip certain common paths
    const skipPatterns = [
      /\/(login|signin|register|contact|about|faq|help|terms|privacy)/i,
      /\/(cart|checkout|basket|shop|store|product)/i,
      /\/(events|news|blog|article|press)/i,
      /\/tag\//i,
      /\/category\//i,
      /\/author\//i,
      /\/share\//i,
      /\/print\//i,
      /\/email\//i,
      /\/feed\//i,
      /\/rss\//i,
    ];
    
    return skipPatterns.some(pattern => pattern.test(url));
  }
} 