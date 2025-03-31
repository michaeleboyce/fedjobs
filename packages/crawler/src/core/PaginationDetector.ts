// File path: packages/crawler/src/core/PaginationDetector.ts
import { Logger } from '../utils/Logger';

const logger = new Logger('PaginationDetector');

/**
 * Specialized in detecting pagination across different site formats
 */
export class PaginationDetector {
  /**
   * Common selectors for pagination elements
   */
  private paginationSelectors = [
    // Query parameter based pagination
    'a[href*="page="]',
    'a[href*="p="]',
    
    // Common CSS class based pagination
    '.pagination a',
    '.pager a',
    '.pages a',
    '.page-numbers',
    
    // Aria label based pagination
    '[aria-label*="Next"]',
    '[aria-label*="Previous"]',
    '[aria-label*="Page"]',
    
    // Common text-based pagination links
    'a:has-text("Next")',
    'a:has-text("Previous")',
    'a:has-text("Page")',
    
    // Common button-based pagination
    'button[aria-label*="Next"]',
    'button[aria-label*="Page"]'
  ];
  
  /**
   * Detects pagination links on a page
   */
  async detectPaginationLinks(page: any): Promise<{ href: string, text: string }[]> {
    try {
      const paginationSelector = this.paginationSelectors.join(', ');
      
      const links = await page.evaluate((selector: string) => {
        const elements = Array.from(document.querySelectorAll(selector));
        
        return elements
          .filter(el => {
            // Filter out links that don't actually navigate to a different page
            const href = el instanceof HTMLAnchorElement ? el.href : null;
            if (!href) return false;
            
            try {
              const url = new URL(href);
              const currentUrl = new URL(window.location.href);
              
              // Must be on same domain
              if (url.hostname !== currentUrl.hostname) return false;
              
              // Must be different from current page
              if (url.href === currentUrl.href) return false;
              
              return true;
            } catch (e) {
              return false;
            }
          })
          .map(el => {
            const href = el instanceof HTMLAnchorElement 
              ? el.href 
              : el.getAttribute('data-url') || '';
              
            return {
              href,
              text: el.textContent?.trim() || '',
              isPagination: true
            };
          });
      }, paginationSelector);
      
      if (links.length > 0) {
        logger.info(`Found ${links.length} pagination links`);
      }
      
      return links;
    } catch (error) {
      logger.error('Error detecting pagination links', { error });
      return [];
    }
  }
  
  /**
   * Checks if a URL is likely a pagination URL
   */
  isPaginationUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for common pagination parameters
      const params = urlObj.searchParams;
      if (params.has('page') || params.has('p') || params.has('pg')) {
        return true;
      }
      
      // Check URL path for pagination patterns
      const paginationPatterns = [
        /\/page\/\d+/i,
        /\/p\/\d+/i,
        /\/pg\/\d+/i,
        /\/pages?\/\d+/i
      ];
      
      return paginationPatterns.some(pattern => pattern.test(urlObj.pathname));
    } catch (e) {
      return false;
    }
  }
}