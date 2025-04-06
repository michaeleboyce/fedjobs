// File path: packages/crawler/src/core/crawler/LinkDiscovery.ts
import { JobParserService } from '../parser';
import { UrlTracker } from './URLTracker';

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
  
  constructor(parser: JobParserService) {
    this.parser = parser;
  }
  
  /**
   * Find and enqueue additional links for crawling
   */
  async findAndEnqueueLinks(
    page: any, 
    enqueueLinks: any, 
    currentUrl: string,
    baseUrl: string,
    urlTracker: UrlTracker
  ): Promise<void> {
    // First handle pagination links
    const paginationLinks = await this.extractPaginationLinks(page);
    
    if (paginationLinks.length > 0) {
      console.log(`[LinkDiscovery] Found ${paginationLinks.length} pagination links`);
      await this.enqueuePaginationLinks(enqueueLinks, paginationLinks);
    }
    
    // Get and filter regular links
    const links = await this.extractAllLinks(page);
    const validLinks = this.filterValidLinks(links, currentUrl, urlTracker);
    
    // Analyze remaining links to find job listings
    const jobLinks = await this.parser.analyzeLinks({
      sourceUrl: baseUrl,
      pageTitle: await page.title(),
      links: validLinks
    });
    
    if (jobLinks.length > 0) {
      console.log(`[LinkDiscovery] Enqueueing ${jobLinks.length} job-related links`);
      await this.enqueueJobLinks(enqueueLinks, jobLinks);
    }
  }
  
  /**
   * Extract pagination links from the page
   */
  private async extractPaginationLinks(page: any): Promise<Array<PaginationLink>> {
    return page.evaluate(() => {
      const links = Array.from(document.querySelectorAll(
        'a[href*="page="], .pagination a, [aria-label*="Next"], [aria-label*="Page"]'
      ));
      
      return links.map(a => ({
        href: (a as HTMLAnchorElement).href,
        text: a.textContent?.trim() || '',
        isPagination: true
      }));
    });
  }
  
  /**
   * Extract all links from the page
   */
  private async extractAllLinks(page: any): Promise<Array<FullLink>> {
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
  }
  
  /**
   * Filter valid links that should be crawled
   */
  private filterValidLinks(
    links: Array<FullLink>, 
    currentUrl: string, 
    urlTracker: UrlTracker
  ): Array<FullLink> {
    return links.filter(link => 
      link.href !== currentUrl && // Skip self-links
      !urlTracker.isRecentlyVisited(link.href) && // Skip recently visited links
      !this.shouldSkipLink(link.href) // Skip links matching patterns to ignore
    );
  }
  
  /**
   * Enqueue pagination links with high priority
   */
  private async enqueuePaginationLinks(enqueueLinks: any, paginationLinks: Array<PaginationLink>): Promise<void> {
    await enqueueLinks({
      urls: paginationLinks.map(link => link.href),
      transformRequestFunction: (req: any) => {
        req.userData = { ...(req.userData || {}), isPagination: true, priority: 3 };
        return req;
      }
    });
  }
  
  /**
   * Enqueue job links with medium priority
   */
  private async enqueueJobLinks(enqueueLinks: any, jobLinks: string[]): Promise<void> {
    await enqueueLinks({
      urls: jobLinks,
      transformRequestFunction: (req: any) => {
        req.userData = { ...req.userData, isJobLink: true, priority: 2 };
        return req;
      }
    });
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