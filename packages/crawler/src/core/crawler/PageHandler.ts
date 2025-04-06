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
     * Extract data from the page
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