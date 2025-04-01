// packages/crawler/src/core/DefaultPageProcessor.ts
import { IPageProcessor } from '../interfaces/IPageProcessor';
import { IParser } from '../interfaces/IParser';
import { Logger } from '../utils/Logger';

const logger = new Logger('DefaultPageProcessor');

/**
 * Helper function to safely log errors with proper typing
 */
function logError(message: string, err: unknown): void {
  if (err instanceof Error) {
    logger.error(message, { 
      message: err.message, 
      stack: err.stack,
      name: err.name
    });
  } else if (typeof err === 'string') {
    logger.error(message, { details: err });
  } else {
    logger.error(message, { details: String(err) });
  }
}

/**
 * Helper function to safely log info with error data
 */
function logInfoError(message: string, err: unknown): void {
  if (err instanceof Error) {
    logger.info(message, { 
      errorMessage: err.message
    });
  } else if (typeof err === 'string') {
    logger.info(message, { errorDetails: err });
  } else {
    logger.info(message, { errorDetails: String(err) });
  }
}

/**
 * Default implementation of page processing logic
 */
export class DefaultPageProcessor implements IPageProcessor {
  private parser: IParser;
  
  constructor(parser: IParser) {
    this.parser = parser;
  }
  
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
      logger.info('NetworkIdle timeout - continuing anyway');
    }
  }
  
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
      logInfoError('Error getting meta description', error);
    }
    
    return { content, title, description };
  }
  
  async findAndEnqueueLinks(
    page: any, 
    enqueueLinks: (options: {
      urls: string[];
      transformRequestFunction?: (req: any) => any | false;
    }) => Promise<void>,
    currentUrl: string,
    baseUrl: string
  ): Promise<string[]> {
    try {
      // First handle pagination links
      const paginationLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll(
          'a[href*="page="], .pagination a, [aria-label*="Next"], [aria-label*="Page"]'
        ));
        
        return links.map(a => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim() || '',
          isPagination: true
        }));
      });
      
      if (paginationLinks.length > 0) {
        logger.info(`Found ${paginationLinks.length} pagination links`);
        
        // Enqueue pagination links with high priority
        await enqueueLinks({
          urls: paginationLinks.map((link: { href: string }) => link.href),
          transformRequestFunction: (req: any) => {
            req.userData = { ...(req.userData || {}), isPagination: true, priority: 3 };
            return req;
          }
        });
      }
      
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
      
      // Log found links
      logger.info(`Found ${links.length} total links on the page`);
      
      // Use the parser to analyze links for job-related content
      const jobLinks = await this.parser.analyzeLinks({
        links,
        sourceUrl: baseUrl,
        pageTitle: await page.title()
      });
      
      if (jobLinks.length > 0) {
        logger.info(`Enqueueing ${jobLinks.length} job-related links`);
        
        // Debug output for job links
        jobLinks.forEach((link, i) => {
          logger.debug(`Job link #${i+1}: ${link}`);
        });
        
        await enqueueLinks({
          urls: jobLinks,
          transformRequestFunction: (req: any) => {
            req.userData = { ...req.userData, isJobLink: true, priority: 2 };
            return req;
          }
        });
      }
      
      return jobLinks;
    } catch (error) {
      logError('Error finding links', error);
      return [];
    }
  }
}