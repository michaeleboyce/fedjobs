// File path: packages/crawler/src/core/crawler.ts
import { PlaywrightCrawler, LogLevel, log } from 'crawlee';
import { URL } from 'url';
import { CrawlHistoryEntry, CrawlJobOptions, JobPostingData } from '../types';
import { JobParserService } from './parser';

export class WebCrawler {
  private urlHistory: Map<string, Date> = new Map();
  private readonly HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  private activeCrawlers: Map<number, PlaywrightCrawler> = new Map();
  private parser: JobParserService;
  
  constructor(parser?: JobParserService) {
    log.setLevel(LogLevel.INFO);
    this.parser = parser || new JobParserService();
    console.log('[WebCrawler] Initialized with PlaywrightCrawler from crawlee');
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
      maxJobs = 20, 
      onJobFound, 
      onComplete, 
      onError, 
      sourceId 
    } = options;
    
    console.log(`[WebCrawler] Starting crawl of ${url} with keywords: ${keywords || 'none'}`);
    
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
      // More time for pages to load
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
          
          // Parse jobs data
          console.log(`[WebCrawler] Parsing job data from ${request.url}`);
          const jobData = await this.parser.parseJobsFromPage({
            url: request.url,
            content,
            title,
            description,
            keywords
          });
          
          console.log(`[WebCrawler] Found ${jobData.length} jobs on ${request.url}`);
          
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
          
          // Find and enqueue more links
          await this.findAndEnqueueLinks(page, enqueueLinks, request.url, url);
          
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
        break;
      }
      
      // Check for duplicates based on URL and title
      const isDuplicate = results.some(existingJob => 
        existingJob.url === job.url && existingJob.title === job.title
      );
      
      if (!isDuplicate) {
        // Add to results
        results.push(job);
        console.log(`[WebCrawler] Added job to results: ${job.title}`);
        
        // Call onJobFound callback if provided
        if (onJobFound) {
          await onJobFound(job);
        }
      } else {
        console.log(`[WebCrawler] Skipping duplicate job: ${job.title}`);
      }
    }
  }
  
  /**
   * Find and enqueue additional links for crawling
   */
  private async findAndEnqueueLinks(
    page: any, 
    enqueueLinks: any, 
    currentUrl: string,
    baseUrl: string
  ): Promise<void> {
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
    // Filter out invalid or non-HTTP links
    const validLinks = links.filter((link: { href: string }) => 
      link.href !== currentUrl && // Skip self-links
      !this.isRecentlyVisited(link.href) && // Skip recently visited links
      !this.shouldSkipLink(link.href) // Skip links matching patterns to ignore
    );
    
    // Analyze remaining links to prioritize those that likely contain job listings
    const jobLinks = await this.parser.analyzeLinks({
      sourceUrl: baseUrl,
      pageTitle: await page.title(),
      links: validLinks
    });
    
    if (jobLinks.length > 0) {
      console.log(`[WebCrawler] Enqueueing ${jobLinks.length} job-related links`);
      
      await enqueueLinks({
        urls: jobLinks,
        transformRequestFunction: (req: any) => {
          req.userData = { ...req.userData, isJobLink: true, priority: 2 };
          return req;
        }
      });
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