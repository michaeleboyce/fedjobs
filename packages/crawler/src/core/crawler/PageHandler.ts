// File path: packages/crawler/src/core/crawler/PageHandler.ts

/**
 * Handles page setup and data extraction
 */
export class PageHandler {
    /**
     * Setup the page for crawling
     */
    async setupPage(page: any): Promise<void> {
      // Set viewport
      await page.setViewportSize({ width: 1280, height: 800 });
      
      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Give JS some time to execute
      
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        // Continue anyway if networkidle times out
        console.log(`[PageHandler] NetworkIdle timeout - continuing anyway`);
      }
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
        console.log(`[PageHandler] Error getting meta description:`, error);
      }
      
      return { content, title, description };
    }
}
