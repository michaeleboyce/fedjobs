// packages/crawler/src/interfaces/IPageProcessor.ts
export interface IPageProcessor {
    /**
     * Setup the page for crawling
     */
    setupPage(page: any): Promise<void>;
    
    /**
     * Extract data from the page
     */
    extractPageData(page: any): Promise<{
      content: string;
      title: string;
      description: string;
    }>;
    
    /**
     * Find and enqueue links for crawling
     * 
     * @param page The playwright page object
     * @param enqueueLinks Function to enqueue links for crawling
     * @param currentUrl Current page URL
     * @param baseUrl Base URL of the crawl
     * @returns Array of job-related links found
     */
    findAndEnqueueLinks(
      page: any,
      enqueueLinks: (options: {
        urls: string[];
        transformRequestFunction?: (req: any) => any | false;
      }) => Promise<void>,
      currentUrl: string,
      baseUrl: string
    ): Promise<string[]>;
  }