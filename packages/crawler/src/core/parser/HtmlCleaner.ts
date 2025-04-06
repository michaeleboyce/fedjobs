// File path: packages/crawler/src/core/parser/HtmlCleaner.ts
import { load } from 'cheerio';
import { Logger } from '../../utils/Logger';

/**
 * Responsible for cleaning HTML content to extract meaningful text
 */
export class HtmlCleaner {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('HtmlCleaner');
  }
  
  /**
   * Clean HTML content to extract meaningful text
   * @param html - Raw HTML content
   * @returns Cleaned text content
   */
  public cleanHtml(html: string): string {
    try {
      // Load HTML into cheerio
      const $ = load(html);
      
      // Remove scripts, styles, and other non-content elements
      $('script, style, svg, img, iframe, noscript, head, link, meta').remove();
      
      // Remove CSS classes and inline styles that might affect extraction
      $('*').removeAttr('class').removeAttr('style');
      
      // Extract main content selectors that typically contain the actual page content
      const mainContentSelectors = ['main', 'article', '#content', '#main', '.content', '.main-content'];
      
      let mainContent = '';
      
      // Try to find main content using common selectors
      for (const selector of mainContentSelectors) {
        if ($(selector).length) {
          const text = $(selector).text().trim();
          if (text.length > mainContent.length) {
            mainContent = text;
          }
        }
      }
      
      // If none of the selectors found substantial content, fall back to body
      if (mainContent.length < 100) {
        mainContent = $('body').text();
      }
      
      // Clean up whitespace
      const cleaned = mainContent.replace(/\s+/g, ' ').trim();
      
      // Check if we have actual content
      if (cleaned.length < 50) {
        this.logger.warn('cleanHtml produced very little content, falling back to partial HTML');
        
        // As a fallback, get visible text from paragraphs, lists, headings, etc.
        const visibleElements = $('h1, h2, h3, h4, h5, h6, p, li, div > *:not(script):not(style)').map((index, element) => {
          return $(element).text().trim();
        }).get().join(' ');
        
        return visibleElements.replace(/\s+/g, ' ').trim();
      }
      
      return cleaned;
    } catch (error: unknown) {
      this.logger.error('Error in cleanHtml:', error as Record<string, any>);
    
      // If Cheerio fails, try a simple regex approach to extract text
      const strippedHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      this.logger.info('Falling back to regex-based HTML cleaning');
      return strippedHtml;
    }
  }
}