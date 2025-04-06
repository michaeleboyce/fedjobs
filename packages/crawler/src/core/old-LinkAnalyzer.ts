// File path: packages/crawler/src/core/LinkAnalyzer.ts
import { EnqueueStrategy } from '../types';
import { Logger } from '../utils/Logger';

const logger = new Logger('LinkAnalyzer');

/**
 * Analyzes and manages links found during crawling
 */
export class LinkAnalyzer {
  // Patterns to exclude from analysis
  private skipPatterns = [
    /\.(jpg|jpeg|png|gif|svg|css|js|pdf|doc|xls|ppt)$/i,
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
  
  // Keywords that typically indicate job-related content
  private jobKeywords = [
    /career/i, 
    /job/i, 
    /position/i, 
    /employ/i, 
    /opportunit/i, 
    /vacanc/i,
    /apply/i,
    /opening/i,
    /hire/i,
    /recruit/i
  ];
  
  /**
   * Extracts links from a page
   */
  async extractLinks(page: any): Promise<any[]> {
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
    
    return links;
  }
  
  /**
   * Filter links with basic criteria
   */
  filterLinks(links: any[]): any[] {
    return links.filter(link => !this.shouldSkipLink(link.href));
  }
  
  /**
   * Filter links based on keyword patterns
   */
  filterLinksWithKeywords(links: any[]): any[] {
    const filtered = links.filter(link => 
      this.jobKeywords.some(pattern => 
        pattern.test(link.href) || 
        pattern.test(link.text) || 
        pattern.test(link.title) || 
        pattern.test(link.aria)
      ) && !this.shouldSkipLink(link.href)
    );
    
    logger.info(`Found ${filtered.length} keyword-matched links out of ${links.length}`);
    return filtered;
  }
  
  /**
   * Determine if a link should be skipped based on patterns
   */
  shouldSkipLink(url: string): boolean {
    return this.skipPatterns.some(pattern => pattern.test(url));
  }
  
  /**
   * Choose the best link enqueuing strategy based on link characteristics
   */
  async chooseBestStrategy(
    links: any[], 
    pageUrl: string, 
    pageTitle: string
  ): Promise<EnqueueStrategy> {
    const validLinks = this.filterLinks(links);
    
    if (validLinks.length === 0) {
      logger.info(`No valid links found on page ${pageUrl}`);
      return EnqueueStrategy.NONE;
    }
    
    // If page might be a job listing page
    if (this.jobKeywords.some(kw => kw.test(pageTitle)) && validLinks.length > 5) {
      logger.info(`Page appears to be job-related, using AI-powered strategy`);
      return EnqueueStrategy.AI_POWERED;
    }
    
    // For pages with many links, use AI to analyze
    if (validLinks.length > 10) {
      logger.info(`Page has ${validLinks.length} links, using AI-powered strategy`);
      return EnqueueStrategy.AI_POWERED;
    }
    
    // Default to keyword-based for other pages
    logger.info(`Using keyword-based strategy for ${pageUrl}`);
    return EnqueueStrategy.KEYWORD_BASED;
  }
  
  /**
   * Transform a request based on link characteristics
   */
  transformRequest(request: any): any {
    // Skip links matching patterns to ignore
    if (this.shouldSkipLink(request.url)) {
      return false;
    }
    
    // Prioritize links that look like job listings
    const isJobRelated = this.jobKeywords.some(pattern => pattern.test(request.url));
    if (isJobRelated) {
      request.userData = { ...request.userData, priority: 1, isJobLink: true };
    } else {
      request.userData = { ...request.userData, priority: 0 };
    }
    
    return request;
  }
}