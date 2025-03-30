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
      // More time for pages to load
      navigationTimeoutSecs: 60,
      // Log successful requests too
      failedRequestHandler: async ({ request, error, log }) => {
        log.error(`Request ${request.url} failed: ${error}`);
        if (onError) {
          await onError(error as Error, request.url);
        }
      },
      // Limit crawl to the specified domain
      requestHandler: async ({ request, page, enqueueLinks, log }) => {
        log.info(`Processing ${request.url}`);
        console.log(`[JobCrawler] Processing ${request.url}`);
        
        try {
          // Set a reasonable viewport
          await page.setViewportSize({ width: 1280, height: 800 });
          
          // Wait for page to load with longer timeout
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000); // Give JS some time to execute
          
          try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          } catch (e) {
            // Continue anyway if networkidle times out
            console.log(`[JobCrawler] NetworkIdle timeout for ${request.url}`);
          }
          
          // Get page content as HTML
          const content = await page.content();
          console.log(`[JobCrawler] Got content from ${request.url}, length: ${content.length}`);
          
          // Get metadata from page
          const title = await page.title();
          console.log(`[JobCrawler] Page title: ${title}`);
          
          let description = '';
          try {
            description = await page.evaluate(() => {
              const metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
              return metaTag ? metaTag.getAttribute('content') || '' : '';
            });
          } catch (error) {
            // If meta description tag doesn't exist, use an empty string
            console.log(`[JobCrawler] No meta description found`);
          }
          
          // Take screenshot for debugging (optional, remove in production)
          // await page.screenshot({ path: `screenshot-${Date.now()}.png` });
          
          // Parse job data using LLM
          console.log(`[JobCrawler] Parsing job data from ${request.url}`);
          const jobData = await this.parser.parseJobsFromPage({
            url: request.url,
            content,
            title,
            description,
            keywords
          });
          
          console.log(`[JobCrawler] Found ${jobData.length} jobs on ${request.url}`);
          
          if (jobData.length > 0) {
            // Process and store job data
            for (const job of jobData) {
              // Skip if we've already found enough jobs
              if (results.length >= maxJobs) break;
              
              // Add to results
              results.push(job);
              console.log(`[JobCrawler] Job found: ${job.title} at ${job.organization}`);
              
              // Call onJobFound callback if provided
              if (onJobFound) {
                await onJobFound(job);
              }
            }
            
            // If we've found enough jobs, stop crawling
            if (results.length >= maxJobs) {
              console.log(`[JobCrawler] Reached maximum jobs limit (${maxJobs})`);
              await crawler.stop();
              return;
            }
          }
          
          // Find and enqueue links to job listings on the same site
          
          // Get all links on the page
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
              .map(a => {
                return {
                  href: a.href,
                  text: a.textContent?.trim() || '',
                  title: a.getAttribute('title') || '',
                  aria: a.getAttribute('aria-label') || ''
                };
              });
          });
          
          // Filter out invalid or non-HTTP links
          const validLinks = links.filter(link => 
            link.href && 
            (link.href.startsWith('http://') || link.href.startsWith('https://')) &&
            link.href !== url // Skip self-links
          );
          
          if (validLinks.length === 0) {
            console.log(`[JobCrawler] No valid links found on page ${url}`);
            return;
          }
          
          // Skip certain paths that are unlikely to contain job listings
          const skipPatterns = [
            /\.(jpg|jpeg|png|gif|svg|css|js)$/i,
            /\/(login|signin|register|contact|about|faq|help|terms|privacy)/i,
            /\/(cart|checkout|payment|order)/i,
            /\#/i, // Skip fragment identifiers
            /\?s=/i, // Skip search pages
          ];
          
          const filteredLinks = validLinks.filter(link => 
            !skipPatterns.some(pattern => pattern.test(link.href))
          );
          
          console.log(`[JobCrawler] Found ${filteredLinks.length} links after initial filtering`);
          
          // If there are too many links, use AI to analyze them in batch
          if (filteredLinks.length > 5) {
            console.log(`[JobCrawler] Using AI to analyze ${filteredLinks.length} links on ${url}`);
            
            // Create a formatted list of links for the AI
            const linkList = filteredLinks.map(link => 
              `URL: ${link.href}\nText: ${link.text}\nTitle: ${link.title}\nAria: ${link.aria}`
            ).join('\n\n');
            
            try {
              // Use AI to identify which links are likely job listings
              const aiResponse = await this.parser.analyzeLinks({
                sourceUrl: url,
                pageTitle: title,
                links: filteredLinks
              });
              
              console.log(`[JobCrawler] AI identified ${aiResponse.length} job-related links`);
              
              if (aiResponse.length > 0) {
                // Create a set of prioritized links
                const prioritizedUrls = new Set(aiResponse);
                
                // Enqueue the AI-selected links with high priority
                await enqueueLinks({
                  globs: [`https://${hostname}/**`],
                  label: 'job-page',
                  transformRequestFunction: (req) => {
                    // Give high priority to AI-selected links
                    if (prioritizedUrls.has(req.url)) {
                      req.userData = { ...req.userData, priority: 2, aiSelected: true };
                      console.log(`[JobCrawler] Enqueueing AI-prioritized link: ${req.url}`);
                      return req;
                    }
                    
                    // Queue other links with lower priority
                    req.userData = { ...req.userData, priority: 0 };
                    return req;
                  }
                });
                
                return; // Skip the standard enqueueing
              }
            } catch (error) {
              console.error('[JobCrawler] Error using AI to analyze links:', error);
              // Fall back to standard link prioritization on error
            }
          }
          
          // Standard link enqueueing (used if AI analysis is skipped or fails)
          const jobPatterns = [
            /career/i, 
            /job/i, 
            /position/i, 
            /employ/i, 
            /opportunit/i, 
            /vacanc/i,
            /apply/i,
            /opening/i
          ];
          
          // Log potential job-related links for debugging
          const jobLinks = filteredLinks.filter(link => 
            jobPatterns.some(pattern => 
              pattern.test(link.href) || 
              pattern.test(link.text) || 
              pattern.test(link.title) || 
              pattern.test(link.aria)
            )
          );
          
          if (jobLinks.length > 0) {
            console.log(`[JobCrawler] Found ${jobLinks.length} potential job-related links`);
            jobLinks.forEach(link => {
              console.log(`[JobCrawler] Potential job link: ${link.text} -> ${link.href}`);
            });
          }
          
          await enqueueLinks({
            globs: [`https://${hostname}/**`],
            label: 'job-page',
            transformRequestFunction: (req) => {
              // Skip already-filtered patterns
              if (skipPatterns.some(pattern => pattern.test(req.url))) {
                return false;
              }
              
              // Prioritize links that look like job listings
              const isJobRelated = jobPatterns.some(pattern => pattern.test(req.url));
              if (isJobRelated) {
                req.userData = { ...req.userData, priority: 1 };
              }
              
              return req;
            }
          });
        } catch (error) {
          console.error(`[JobCrawler] Error processing ${request.url}:`, error);
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