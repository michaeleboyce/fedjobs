// File path: packages/crawler/src/core/crawler/LinkDiscovery.ts
import { JobParserService } from '../parser';
import { UrlTracker } from './URLTracker';
import { Logger } from '../../utils/Logger';

// Define types for link objects
type PaginationLink = {
  href: string;
  text: string;
  isPagination: boolean;
};

type FullLink = {
  href: string;
  text: string;
  title: string;
  aria: string;
};

/**
 * Discovers and prioritizes links for crawling
 */
export class LinkDiscovery {
  private parser: JobParserService;
  private logger: Logger;
  
  constructor(parser: JobParserService) {
    this.parser = parser;
    this.logger = new Logger('LinkDiscovery');
  }
  
  /**
   * Find and enqueue additional links for crawling
   * - Identifies pagination links first (without AI) to exclude them from analysis
   * - But enqueues job links first (higher priority) then pagination links (lower priority)
   */
  async findAndEnqueueLinks(
    page: any, 
    enqueueLinks: any, 
    currentUrl: string,
    baseUrl: string,
    urlTracker: UrlTracker
  ): Promise<void> {
    try {
      // Step 1: First identify pagination links (without using AI)
      const paginationLinks = await this.extractPaginationLinks(page);
      this.logger.info(`Identified ${paginationLinks.length} pagination links`);
      
      // Step 2: Extract all other links 
      const allLinks = await this.extractAllLinks(page);
      
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
      
      // Step 6: Enqueue links in priority order - job links FIRST (higher priority)
      if (jobLinks.length > 0) {
        this.logger.info(`Enqueueing ${jobLinks.length} job-related links (high priority)`);
        await this.enqueueJobLinks(enqueueLinks, jobLinks);
      }
      
      // Step 7: Enqueue pagination links SECOND (lower priority)
      if (paginationLinks.length > 0) {
        this.logger.info(`Enqueueing ${paginationLinks.length} pagination links (lower priority)`);
        await this.enqueuePaginationLinks(enqueueLinks, paginationLinks);
      }
    } catch (error) {
      this.logger.error(`Error finding and enqueueing links:`, error as Record<string, any>);
    }
  }
  
  /**
   * Extract pagination links from the page
   */
  private async extractPaginationLinks(page: any): Promise<Array<PaginationLink>> {
    try {
      return page.evaluate(() => {
        // Common pagination selectors
        const paginationSelectors = [
          'a[href*="page="]', '.pagination a', '[aria-label*="Next"]', '[aria-label*="Page"]',
          '.pager a', '.pages a', '.next a', '.nextpage', 'a.next', 'a.nextpage', 
          '[data-page]', '[data-testid*="pagination"]',
          // Text-based detection
          'a:has-text("Next")', 'a:has-text("Next Page")', 'a:has-text("Load More")'
        ];
        
        const selector = paginationSelectors.join(', ');
        const links = Array.from(document.querySelectorAll(selector));
        
        return links.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || '',
          isPagination: true
        })).filter(link => link.href && link.href !== '#' && !link.href.includes('javascript:'));
      });
    } catch (error) {
      this.logger.error('Error extracting pagination links:', error as Record<string, any>);
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
      this.logger.error('Error extracting all links:', error as Record<string, any>);
      return [];
    }
  }
  
  /**
   * Pre-filter links that are likely to be job postings without using AI
   * This reduces the number of links that need AI analysis
   */
  private preFilterJobLinks(
    links: Array<FullLink>, 
    currentUrl: string, 
    urlTracker: UrlTracker
  ): Array<FullLink> {
    // Common job-related keywords to look for in URLs, text, or titles
    const jobKeywords = [
      'job', 'career', 'position', 'vacancy', 'opening',
      'apply', 'posting', 'employment', 'requisition', 'id', 
      'opportunity', 'hire', 'role', 'join', 'talent'
    ];
    
    // Filter out links that are definitely not job links
    return links.filter(link => {
      // Skip if already visited
      if (urlTracker.isRecentlyVisited(link.href)) {
        return false;
      }
      
      // Skip self-links
      if (link.href === currentUrl) {
        return false;
      }
      
      // Skip file downloads and irrelevant links
      if (this.shouldSkipLink(link.href)) {
        return false;
      }
      
      // Check for job-related patterns in URL, text, or title
      const url = link.href.toLowerCase();
      const text = link.text.toLowerCase();
      const title = link.title.toLowerCase();
      const aria = link.aria.toLowerCase();
      
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
    });
  }
  
  /**
   * Analyze links using AI to find job postings
   * This is an expensive operation so we only use it on pre-filtered links
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
    
    try {
      this.logger.info(`Running AI analysis on ${preFilteredLinks.length} pre-filtered links`);
      
      // Prepare links for AI analysis
      const linksForAnalysis = {
        sourceUrl: baseUrl,
        pageTitle: pageTitle,
        links: preFilteredLinks
      };
      
      // Use the parser to analyze links with AI
      return await this.parser.analyzeLinks(linksForAnalysis);
    } catch (error) {
      this.logger.error(`Error in AI link analysis:`, error as Record<string, any>);
      
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
      this.logger.error('Error enqueueing pagination links:', error as Record<string, any>);
    }
  }
  
  /**
   * Enqueue job links
   */
  private async enqueueJobLinks(enqueueLinks: any, jobLinks: string[]): Promise<void> {
    try {
      await enqueueLinks({
        urls: jobLinks,
        transformRequestFunction: (req: any) => {
          req.userData = { ...(req.userData || {}), isJobLink: true };
          return req;
        }
      });
    } catch (error) {
      this.logger.error('Error enqueueing job links:', error as Record<string, any>);
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