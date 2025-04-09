// File path: packages/crawler/src/core/crawler/PageHandler.ts
import { Logger } from '../../utils/Logger';

/**
 * Handles page setup and data extraction
 */
export class PageHandler {
    private logger: Logger;
    
    constructor() {
      this.logger = new Logger('PageHandler');
    }
    
    /**
     * Setup the page for crawling with improved reliability
     */
    async setupPage(page: any): Promise<void> {
      // Set viewport
      await page.setViewportSize({ width: 1280, height: 800 });
      
      this.logger.info(`Setting up page and waiting for content to load`);
      
      // Wait for page to load with increased timeouts
      try {
        this.logger.info(`Waiting for DOMContentLoaded event`);
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 }); // Increased to 30 seconds
        this.logger.info(`DOMContentLoaded event fired`);
        
        // Wait for a short time to let initial scripts execute
        await page.waitForTimeout(3000); // Increased from 2000ms to 3000ms
        
        try {
          this.logger.info(`Waiting for network idle state`);
          // Longer timeout for network idle
          await page.waitForLoadState('networkidle', { timeout: 20000 }); // Increased to 20 seconds
          this.logger.info(`Network idle state reached`);
        } catch (e) {
          // Continue anyway if networkidle times out
          this.logger.warn(`NetworkIdle timeout - continuing anyway: ${e instanceof Error ? e.message : String(e)}`);
        }
        
        // Ensure page has rendered properly by waiting for body element
        try {
          this.logger.info(`Waiting for body element to be visible`);
          await page.waitForSelector('body', { timeout: 10000 });
          this.logger.info(`Body element is visible`);
        } catch (e) {
          this.logger.warn(`Error waiting for body element: ${e instanceof Error ? e.message : String(e)}`);
        }
      } catch (e) {
        this.logger.error(`Error during page setup: ${e instanceof Error ? e.message : String(e)}`);
        // Continue anyway, we'll try to extract what we can
      }
      
      this.logger.info(`Page setup completed`);
    }
    
    /**
     * Extract essential data from a web page for parsing
     * 
     * This method extracts three key components from the current page:
     * 1. content: The complete HTML content of the page, including all DOM elements
     *    and their attributes. This is used for job posting extraction and analysis.
     * 2. title: The page title from the <title> tag, which often contains company 
     *    or job board information useful for identification.
     * 3. description: The meta description content from <meta name="description">, 
     *    which frequently contains a summary of the page purpose or job listings.
     *    Falls back to empty string if not available.
     * 
     * @param page Playwright Page object representing the current browser page
     * @returns Object containing the HTML content, page title, and meta description
     */
    async extractPageData(page: any): Promise<{ content: string, title: string, description: string }> {
      this.logger.info(`Extracting page data`);
      
      // Get page content
      let content = '';
      try {
        content = await page.content();
        
        if (content.length === 0) {
          this.logger.error(`Empty content returned from page.content()`);
          // Try another method to extract HTML
          try {
            content = await page.evaluate(() => document.documentElement.outerHTML);
            this.logger.info(`Content extracted using evaluate() method: ${content.length} characters`);
          } catch (evaluateError) {
            this.logger.error(`Failed to extract content using evaluate method:`, evaluateError instanceof Error ? evaluateError : new Error(String(evaluateError)));
          }
        } else {
          this.logger.info(`Content extracted: ${content.length} characters`);
          
          // Log a sample of the content for debugging
          if (content.length > 200) {
            this.logger.debug(`Content sample: ${content.substring(0, 200)}...`);
          } else {
            this.logger.debug(`Content: ${content}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error getting page content:`, error instanceof Error ? error : new Error(String(error)));
        content = '<html><body>Error extracting content</body></html>';
      }
      
      // Get title
      let title = '';
      try {
        title = await page.title();
        this.logger.info(`Title extracted: "${title}"`);
      } catch (error) {
        this.logger.error(`Error getting page title:`, error instanceof Error ? error : new Error(String(error)));
      }
      
      // Get meta description
      let description = '';
      try {
        description = await page.evaluate(() => {
          const metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
          return metaTag ? metaTag.getAttribute('content') || '' : '';
        });
        this.logger.info(`Description extracted: "${description.substring(0, 50)}${description.length > 50 ? '...' : ''}"`);
      } catch (error) {
        this.logger.error(`Error getting meta description:`, error instanceof Error ? error : new Error(String(error)));
      }
      
      // Log content stats for debugging
      this.logger.info(`Extraction complete - Content: ${content.length} bytes, Title: ${title.length} chars, Description: ${description.length} chars`);
      
      return { content, title, description };
    }
}
