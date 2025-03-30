// packages/utils/src/Services/JobCrawlerService/index.ts
import { PlaywrightCrawler } from 'crawlee';
import { JobParser } from './JobParser';
import { URL } from 'url';
import { JobPostingData } from './types';

export interface CrawlJobOptions {
  url: string;
  keywords?: string;
  maxJobs?: number;
  onJobFound?: (job: JobPostingData) => Promise<void>;
  onComplete?: (jobs: JobPostingData[]) => Promise<void>;
  onError?: (error: Error, url: string) => Promise<void>;
}

export class JobCrawlerService {
  private parser: JobParser;
  
  constructor() {
    this.parser = new JobParser();
  }
  
  async crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]> {
    const { url, keywords, maxJobs = 20, onJobFound, onComplete, onError } = options;
    const results: JobPostingData[] = [];
    const hostname = new URL(url).hostname;
    
    // Create a crawler
    const crawler = new PlaywrightCrawler({
      // Use headless browser to handle JavaScript-heavy sites
      headless: true,
      // Limit concurrent requests
      maxConcurrency: 2,
      // Limit crawl to the specified domain
      requestHandler: async ({ request, page, enqueueLinks, log }) => {
        log.info(`Processing ${request.url}`);
        
        try {
          // Wait for page to load
          await page.waitForLoadState('networkidle');
          
          // Get page content as HTML
          const content = await page.content();
          
          // Get metadata from page
          const title = await page.title();
          let description = '';
          try {
            description = await page.evaluate(() => {
              const metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
              return metaTag ? metaTag.getAttribute('content') || '' : '';
            });
          } catch (error) {
            // If meta description tag doesn't exist, use an empty string
          }
          
          // Parse job data using LLM
          const jobData = await this.parser.parseJobsFromPage({
            url: request.url,
            content,
            title,
            description,
            keywords
          });
          
          if (jobData.length > 0) {
            // Process and store job data
            for (const job of jobData) {
              // Skip if we've already found enough jobs
              if (results.length >= maxJobs) break;
              
              // Add to results
              results.push(job);
              
              // Call onJobFound callback if provided
              if (onJobFound) {
                await onJobFound(job);
              }
            }
            
            // If we've found enough jobs, stop crawling
            if (results.length >= maxJobs) {
              await crawler.stop();
              return;
            }
          }
          
          // Find and enqueue links to job listings on the same site
          await enqueueLinks({
            globs: [`https://${hostname}/**`],
            label: 'job-page',
            transformRequestFunction: (req) => {
              // Skip certain paths that are unlikely to contain job listings
              const skipPatterns = [
                /\.(jpg|jpeg|png|gif|svg|css|js)$/i,
                /\/(login|signin|register|contact|about|faq|help|terms|privacy)/i,
                /\/(cart|checkout|payment|order)/i
              ];
              
              if (skipPatterns.some(pattern => pattern.test(req.url))) {
                return false;
              }
              
              return req;
            }
          });
        } catch (error) {
          if (onError) {
            await onError(error as Error, request.url);
          }
          log.error(`Error processing ${request.url}: ${error}`);
        }
      },
      // Limit runs to avoid infinite crawling
      maxRequestsPerCrawl: 50,
    });
    
    try {
      // Start the crawler
      await crawler.run([url]);
      
      // Call onComplete callback if provided
      if (onComplete) {
        await onComplete(results);
      }
      
      return results;
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      if (onError) {
        await onError(error as Error, url);
      }
      return results;
    }
  }
  
  async refreshJobSource(
    sourceId: number, 
    url: string, 
    keywords?: string,
    callbacks?: {
      onJobFound?: (job: JobPostingData) => Promise<void>;
      onComplete?: (jobs: JobPostingData[]) => Promise<void>;
      onError?: (error: Error, url: string) => Promise<void>;
    }
  ): Promise<JobPostingData[]> {
    return this.crawlJobSite({
      url,
      keywords,
      maxJobs: 50,
      ...callbacks
    });
  }
}