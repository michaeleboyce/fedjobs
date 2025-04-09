// packages/crawler/src/core/crawler/LinkDiscovery.ts
import { JobParserService } from '../parser';
import { UrlTracker } from './URLTracker';
import { Logger } from '../../utils/Logger';
import { isKnownJobBoardDomain, matchesJobBoardPattern } from '../../job-boards/constants';

// Define types for link objects
export type PaginationLink = {
  href: string;
  text: string;
  isPagination: boolean;
};

export type FullLink = {
  href: string;
  text: string;
  title: string;
  aria: string;
};

export type ExtractedLinks = {
  jobLinks: string[];
  paginationLinks: PaginationLink[];
};

/**
 * Discovers and prioritizes links for crawling
 * Enhanced with job board detection and prioritization
 */
export class LinkDiscovery {
  private parser: JobParserService;
  private logger: Logger;
  
  constructor(parser: JobParserService) {
    this.parser = parser;
    this.logger = new Logger('LinkDiscovery');
  }
  
  /**
   * Pure function to extract links from a page without enqueuing
   * Returns separate arrays for job links and pagination links
   */
  async extractLinks(
    page: any, 
    currentUrl: string,
    baseUrl: string,
    urlTracker: UrlTracker
  ): Promise<ExtractedLinks> {
    try {
      this.logger.info(`Extracting links from ${currentUrl}`);
      
      // Step 1: First identify pagination links (without using AI)
      const paginationLinks = await this.extractPaginationLinks(page);
      this.logger.info(`Identified ${paginationLinks.length} pagination links`);
      
      // Step 2: Extract all other links 
      const allLinks = await this.extractAllLinks(page);
      this.logger.info(`Extracted ${allLinks.length} total links from page`);
      
      // Step 3: Remove pagination links from links to analyze
      const paginationUrls = new Set(paginationLinks.map(link => link.href));
      const linksForAnalysis = allLinks.filter(link => !paginationUrls.has(link.href));
      
      // Step 4: Pre-filter remaining links for potential job postings
      const preFilteredLinks = this.preFilterJobLinks(linksForAnalysis, currentUrl, urlTracker);
      this.logger.info(`Pre-filtered ${linksForAnalysis.length} links to ${preFilteredLinks.length} potential job links`);
      
      // Step 5: Use AI to analyze the pre-filtered links (only if we have links to analyze)
      let jobLinks: string[] = [];
      if (preFilteredLinks.length > 0) {
        jobLinks = await this.analyzeLinksWithAI(preFilteredLinks, baseUrl, await page.title());
        this.logger.info(`AI analysis identified ${jobLinks.length} job links`);
      }
      
      return {
        jobLinks,
        paginationLinks
      };
    } catch (error) {
      this.logger.error(`Error extracting links:`, error instanceof Error ? error : new Error(String(error)));
      return {
        jobLinks: [],
        paginationLinks: []
      };
    }
  }
  
  /**
   * Legacy method that still supports the old pattern of combined extraction and enqueuing
   * @deprecated Use extractLinks() and then enqueue separately
   */
  async findAndEnqueueLinks(
    page: any, 
    enqueueLinks: any, 
    currentUrl: string,
    baseUrl: string,
    urlTracker: UrlTracker
  ): Promise<void> {
    try {
      // Extract links using the new method
      const { jobLinks, paginationLinks } = await this.extractLinks(page, currentUrl, baseUrl, urlTracker);
      
      // Enqueue job links first (higher priority)
      if (jobLinks.length > 0) {
        this.logger.info(`Enqueueing ${jobLinks.length} job-related links (high priority)`);
        await this.enqueueJobLinks(enqueueLinks, jobLinks);
      }
      
      // Enqueue pagination links second (lower priority)
      if (paginationLinks.length > 0) {
        this.logger.info(`Enqueueing ${paginationLinks.length} pagination links (lower priority)`);
        await this.enqueuePaginationLinks(enqueueLinks, paginationLinks);
      }
    } catch (error) {
      this.logger.error(`Error finding and enqueueing links:`, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Extract pagination links from the page
   */
  private async extractPaginationLinks(page: any): Promise<Array<PaginationLink>> {
    try {
      return page.evaluate(() => {
        // Common pagination selectors (standard CSS only)
        const paginationSelectors = [
          'a[href*="page="]', '.pagination a', '[aria-label*="Next"]', '[aria-label*="Page"]',
          '.pager a', '.pages a', '.next a', '.nextpage', 'a.next', 'a.nextpage', 
          '[data-page]', '[data-testid*="pagination"]'
        ];
        
        const selector = paginationSelectors.join(', ');
        const selectorLinks = Array.from(document.querySelectorAll(selector));
        
        // Separately find links by text content (since :has-text() is not valid in querySelectorAll)
        const allLinks = Array.from(document.querySelectorAll('a'));
        const textBasedLinks = allLinks.filter(a => {
          const text = (a.textContent || '').toLowerCase().trim();
          return text.includes('next') || text === 'next page' || text.includes('load more');
        });
        
        // Combine both sets of links, removing duplicates
        const allPaginationLinks = [...selectorLinks, ...textBasedLinks];
        const uniqueLinks = Array.from(new Set(allPaginationLinks));
        
        return uniqueLinks.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || '',
          isPagination: true
        })).filter(link => link.href && link.href !== '#' && !link.href.includes('javascript:'));
      });
    } catch (error) {
      this.logger.error('Error extracting pagination links:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
  
  /**
   * Extract all links from the page
   */
  private async extractAllLinks(page: any): Promise<Array<FullLink>> {
    try {
      return page.evaluate(() => {
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
    } catch (error) {
      this.logger.error('Error extracting all links:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }
  
  /**
   * Pre-filter links that are likely to be job postings without using AI
   * Enhanced with job board detection
   */
  private preFilterJobLinks(
    links: Array<FullLink>, 
    currentUrl: string, 
    urlTracker: UrlTracker
  ): Array<FullLink> {
    // Separate job board links from other links
    const jobBoardLinks: Array<FullLink> = [];
    const otherLinks: Array<FullLink> = [];
    
    // First pass: categorize links
    for (const link of links) {
      // Skip if already visited
      if (urlTracker.isRecentlyVisited(link.href)) {
        continue;
      }
      
      // Skip self-links
      if (link.href === currentUrl) {
        continue;
      }
      
      // Skip file downloads and irrelevant links
      if (this.shouldSkipLink(link.href)) {
        continue;
      }
      
      // Check if this is a job board link
      try {
        const urlObj = new URL(link.href);
        if (isKnownJobBoardDomain(urlObj.hostname)) {
          jobBoardLinks.push(link);
        } else {
          otherLinks.push(link);
        }
      } catch (error) {
        // Invalid URL, ignore
        continue;
      }
    }
    
    if (jobBoardLinks.length > 0) {
      this.logger.info(`Found ${jobBoardLinks.length} links to known job boards`);
    }
    
    // For job board links, check if they match job board patterns
    const likelyJobBoardLinks = jobBoardLinks.filter(link => {
      return matchesJobBoardPattern(link.href) || this.linkLooksLikeJob(link);
    });
    
    // Now filter other links using existing logic
    const likelyOtherJobLinks = otherLinks.filter(link => this.linkLooksLikeJob(link));
    
    // Prioritize job board links
    return [...likelyJobBoardLinks, ...likelyOtherJobLinks];
  }
  
  /**
   * Check if a link looks like a job posting based on text content and URL
   */
  private linkLooksLikeJob(link: FullLink): boolean {
    const url = link.href.toLowerCase();
    const text = link.text.toLowerCase();
    const title = link.title.toLowerCase();
    const aria = link.aria.toLowerCase();
    
    const jobKeywords = [
      'job', 'career', 'position', 'vacancy', 'opening',
      'apply', 'posting', 'employment', 'requisition', 'id', 
      'opportunity', 'hire', 'role', 'join', 'talent'
    ];
    
    // Check for job keywords in URL, text, or title
    const hasJobKeyword = jobKeywords.some(keyword => 
      url.includes(keyword) || 
      text.includes(keyword) || 
      title.includes(keyword) ||
      aria.includes(keyword)
    );
    
    // Check for job ID patterns (e.g., job/12345, position_id=12345)
    const hasJobIdPattern = /\/job\/\d+|job[_-]id=\d+|position[_-]id=\d+|req[_-]id=\d+/i.test(url);
    
    // Look for typical job URL patterns
    const hasJobUrlPattern = /\/jobs?\/|\/careers?\/|\/positions?\//i.test(url);
    
    return hasJobKeyword || hasJobIdPattern || hasJobUrlPattern;
  }
  
  /**
   * Analyze links using AI to find job postings
   */
  private async analyzeLinksWithAI(
    preFilteredLinks: Array<FullLink>,
    baseUrl: string,
    pageTitle: string
  ): Promise<string[]> {
    // If we have very few links, we can return them all without AI analysis
    if (preFilteredLinks.length <= 3) {
      this.logger.info(`Skipping AI analysis for ${preFilteredLinks.length} links (below threshold)`);
      return preFilteredLinks.map(link => link.href);
    }
    
    // Log the top 20 potential links for debugging
    this.logger.info(`Top 20 potential links for AI analysis:`);
    preFilteredLinks.slice(0, 20).forEach((link, i) => {
      this.logger.info(`[${i + 1}] ${link.text.substring(0, 40)}... -> ${link.href}`);
    });
    
    try {
      this.logger.info(`Running AI analysis on ${preFilteredLinks.length} pre-filtered links`);
      
      // Prepare links for AI analysis
      const linksForAnalysis = {
        sourceUrl: baseUrl,
        pageTitle: pageTitle,
        links: preFilteredLinks
      };
      
      // Call the AI-powered link analysis function from the parser service
      // This calls the analyzeLinks method in JobParserService which uses AI to identify job-related links
      const aiSelectedLinks = await this.parser.analyzeLinks(linksForAnalysis);
      
      // Log the top 5 links identified by AI
      this.logger.info(`Top 5 links identified by AI:`);
      const linkMap = new Map(preFilteredLinks.map(link => [link.href, link]));
      aiSelectedLinks.slice(0, 5).forEach((url, i) => {
        const linkInfo = linkMap.get(url);
        const text = linkInfo ? linkInfo.text.substring(0, 40) : 'Unknown text';
        this.logger.info(`[${i + 1}] ${text}... -> ${url}`);
      });
      
      return aiSelectedLinks;
    } catch (error) {
      this.logger.error(`Error in AI link analysis:`, error instanceof Error ? error : new Error(String(error)));
      
      // Fallback: Return the top 5 most likely job links based on our pre-filtering
      // Sort links by "job relevance score" - a simple heuristic calculation
      const scoredLinks = preFilteredLinks.map(link => {
        let score = 0;
        
        // Score based on URL
        if (link.href.includes('job/')) score += 5;
        if (link.href.includes('career')) score += 4;
        if (link.href.includes('position')) score += 4;
        if (link.href.includes('vacancy')) score += 3;
        if (link.href.includes('apply')) score += 3;
        if (/req[_-]id=\d+/i.test(link.href)) score += 5;
        if (/job[_-]id=\d+/i.test(link.href)) score += 5;
        
        // Score based on link text
        const text = link.text.toLowerCase();
        if (text.includes('apply')) score += 3;
        if (text.includes('view job')) score += 4;
        if (text.includes('details')) score += 2;
        if (text.match(/^[a-z\s]+ \(\d+\)$/i)) score += 3; // Job title with ID pattern
        
        return { link, score };
      }).sort((a, b) => b.score - a.score);
      
      // Return top 5 links with highest scores
      return scoredLinks.slice(0, 5).map(item => item.link.href);
    }
  }
  
  /**
   * Enqueue pagination links
   * @private
   */
  private async enqueuePaginationLinks(enqueueLinks: any, paginationLinks: Array<PaginationLink>): Promise<void> {
    try {
      await enqueueLinks({
        urls: paginationLinks.map(link => link.href),
        transformRequestFunction: (req: any) => {
          req.userData = { ...(req.userData || {}), isPagination: true };
          return req;
        }
      });
    } catch (error) {
      this.logger.error('Error enqueueing pagination links:', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Enqueue job links
   * @private
   */
  private async enqueueJobLinks(enqueueLinks: any, jobLinks: string[]): Promise<void> {
    try {
      await enqueueLinks({
        urls: jobLinks,
        transformRequestFunction: (req: any) => {
          // Check if this is a job board link
          try {
            const urlObj = new URL(req.url);
            if (isKnownJobBoardDomain(urlObj.hostname)) {
              req.userData = { ...(req.userData || {}), isJobLink: true, isJobBoardUrl: true };
            } else {
              req.userData = { ...(req.userData || {}), isJobLink: true };
            }
          } catch {
            req.userData = { ...(req.userData || {}), isJobLink: true };
          }
          return req;
        }
      });
    } catch (error) {
      this.logger.error('Error enqueueing job links:', error instanceof Error ? error : new Error(String(error)));
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
    
    // Skip certain common paths that definitely aren't job listings
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
      /\/search\//i,
      /\/(facebook|twitter|linkedin|instagram|youtube)/i,
      /\#(comments|respond)/i
    ];
    
    return skipPatterns.some(pattern => pattern.test(url));
  }
}