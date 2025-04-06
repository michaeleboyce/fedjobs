// packages/crawler/src/core/parser/HtmlCleaner.ts
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
      const $ = load(html);

      // Remove scripts, styles, and other non-content elements
      $('script, style, svg, img, iframe, noscript, head, link, meta').remove();

      // Remove inline style/class
      $('*').removeAttr('class').removeAttr('style');

      // Extract main content from common selectors
      const mainContentSelectors = [
        'main',
        'article',
        '#content',
        '#main',
        '.content',
        '.main-content'
      ];

      let mainContent = '';
      for (const selector of mainContentSelectors) {
        if ($(selector).length) {
          const text = $(selector).text().trim();
          if (text.length > mainContent.length) {
            mainContent = text;
          }
        }
      }

      // Fallback to entire body if main is too short
      if (mainContent.length < 100) {
        mainContent = $('body').text().trim();
      }

      // Clean up whitespace
      let cleaned = mainContent.replace(/\s+/g, ' ').trim();

      // If still too short, do a simpler fallback
      if (cleaned.length < 50) {
        this.logger.warn('cleanHtml produced very little content, falling back to partial HTML');
        // Last fallback: just do body.text() again but strip extra spaces
        // (It's simpler than iterating text nodes, which risk reordering.)
        cleaned = $('body').text().replace(/\s+/g, ' ').trim();
      }

      return cleaned;
    } catch (error: unknown) {
      this.logger.error('Error in cleanHtml:', error as Record<string, any>);
      
      // If Cheerio fails, fallback to regex
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
