// packages/utils/src/Services/JobCrawlerService/index.ts
import { PlaywrightCrawler, LogLevel, log } from 'crawlee';
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
log.setLevel(LogLevel.INFO);

export class JobCrawlerService {
  private parser: JobParser;
  
  constructor() {
    this.parser = new JobParser();
    console.log('[JobCrawlerService] Initialized with PlaywrightCrawler from crawlee');
    
    // Check if Playwright is properly installed
    try {
      const playwrightPath = require.resolve('playwright');
      console.log('[JobCrawlerService] Playwright found at:', playwrightPath);
    } catch (error) {
      console.error('[JobCrawlerService] Error finding Playwright:', error);
    }
  }
  
  async crawlJobSite(options: CrawlJobOptions): Promise<JobPostingData[]> {
    const { url, keywords, maxJobs = 20, onJobFound, onComplete, onError } = options;
    console.log(`[JobCrawlerService] Starting crawl of ${url} with keywords: ${keywords || 'none'}`);
    console.log(`[JobCrawlerService] Max jobs: ${maxJobs}`);
    
    const results: JobPostingData[] = [];
    
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
      console.log(`[JobCrawlerService] Hostname: ${hostname}`);
    } catch (error) {
      console.error(`[JobCrawlerService] Invalid URL: ${url}`, error);
      throw new Error(`Invalid URL: ${url}`);
    }
    
    // Create a crawler
    console.log(`[JobCrawlerService] Creating PlaywrightCrawler for ${url}`);
    const crawler = new PlaywrightCrawler({
      // Use headless browser to handle JavaScript-heavy sites
      headless: true,
      // Limit concurrent requests
      maxConcurrency: 2,
      // More time for pages to load
      navigationTimeoutSecs: 90,
      // Log successful requests too
      failedRequestHandler: async ({ request, error, log }) => {
        console.error(`[JobCrawlerService] Request ${request.url} failed:`, error);
        log.error(`Request ${request.url} failed: ${error}`);
        if (onError) {
          await onError(error as Error, request.url);
        }
      },
      // Limit crawl to the specified domain
      requestHandler: async ({ request, page, enqueueLinks, log }) => {
        log.info(`Processing ${request.url}`);
        console.log(`[JobCrawler] ======== CRAWLING PAGE: ${request.url} ========`);
        
        try {
          // Log browser and page details
          const browser = page.context().browser();
          if (browser) {
            console.log(`[JobCrawler] Using browser:`, browser.version());
          } else {
            console.log(`[JobCrawler] Browser information not available`);
          }
          
          // Set a reasonable viewport
          console.log(`[JobCrawler] Setting viewport size`);
          await page.setViewportSize({ width: 1280, height: 800 });
          
          // Wait for page to load with longer timeout
          console.log(`[JobCrawler] Waiting for domcontentloaded state`);
          await page.waitForLoadState('domcontentloaded');
          console.log(`[JobCrawler] Waiting additional 2s for scripts to execute`);
          await page.waitForTimeout(2000); // Give JS some time to execute
          
          try {
            console.log(`[JobCrawler] Waiting for networkidle state (max 10s)`);
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            console.log(`[JobCrawler] Network idle achieved`);
          } catch (e) {
            // Continue anyway if networkidle times out
            console.log(`[JobCrawler] NetworkIdle timeout for ${request.url} - continuing anyway`);
          }
          
          // Get page content as HTML
          console.log(`[JobCrawler] Getting page content`);
          const content = await page.content();
          console.log(`[JobCrawler] Got content from ${request.url}, length: ${content.length}`);
          
          // Get metadata from page
          console.log(`[JobCrawler] Getting page title`);
          const title = await page.title();
          console.log(`[JobCrawler] Page title: "${title}"`);
          
          let description = '';
          try {
            console.log(`[JobCrawler] Getting meta description`);
            description = await page.evaluate(() => {
              const metaTag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
              return metaTag ? metaTag.getAttribute('content') || '' : '';
            });
            if (description) {
              console.log(`[JobCrawler] Meta description: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"`);
            } else {
              console.log(`[JobCrawler] No meta description found`);
            }
          } catch (error) {
            // If meta description tag doesn't exist, use an empty string 
            console.log(`[JobCrawler] Error getting meta description:`, error);
          }
          
          // Take screenshot for debugging
          const screenshotPath = `screenshot-${Date.now()}.png`;
          console.log(`[JobCrawler] Taking page screenshot to ${screenshotPath}`);
          try {
            //await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`[JobCrawler] Screenshot saved successfully`);
          } catch (screenshotError) {
            console.error(`[JobCrawler] Error taking screenshot:`, screenshotError);
          }
          
          // Parse job data using LLM
          console.log(`[JobCrawler] Parsing job data from ${request.url} using AI`);
          console.log(`[JobCrawler] Starting AI analysis at ${new Date().toISOString()}`);
          
          try {
            const jobData = await this.parser.parseJobsFromPage({
              url: request.url,
              content,
              title,
              description,
              keywords
            });
            
            console.log(`[JobCrawler] AI analysis complete at ${new Date().toISOString()}`);
            console.log(`[JobCrawler] Found ${jobData.length} jobs on ${request.url}`);
            
            if (jobData.length > 0) {
              // Detailed logging of each job found
              jobData.forEach((job, index) => {
                console.log(`[JobCrawler] Job #${index + 1} details:`);
                console.log(`  Title: ${job.title}`);
                console.log(`  Organization: ${job.organization}`);
                console.log(`  Location: ${job.location || 'N/A'}`);
                console.log(`  URL: ${job.url}`);
                if (job.salary) console.log(`  Salary: ${job.salary}`);
                console.log(`  Description length: ${job.description?.length || 0} chars`);
              });
              
              // Process and store job data
              for (const job of jobData) {
                // Skip if we've already found enough jobs
                if (results.length >= maxJobs) {
                  console.log(`[JobCrawler] Reached maximum jobs limit (${maxJobs}), stopping processing`);
                  break;
                }
                
                // Add to results (including possible duplicates)
                results.push(job);
                console.log(`[JobCrawler] Added job to results: ${job.title} at ${job.organization}`);
                
                // Call onJobFound callback if provided
                if (onJobFound) {
                  console.log(`[JobCrawler] Calling onJobFound callback for "${job.title}"`);
                  await onJobFound(job);
                }
              }
            } else {
              console.log(`[JobCrawler] No jobs found on this page`);
            }
          } catch (parseError) {
            console.error(`[JobCrawler] Error parsing jobs from page:`, parseError);
            if (onError) {
              await onError(parseError as Error, request.url);
            }
          }
          
          // If we've found enough jobs, stop crawling
          if (results.length >= maxJobs) {
            console.log(`[JobCrawler] Reached maximum jobs limit (${maxJobs})`);
            await crawler.stop();
            return;
          }
          
          // Find and enqueue links to job listings on the same site
          console.log(`[JobCrawler] Looking for links to crawl on ${request.url}`);
          
          // Get all links on the page
          console.log(`[JobCrawler] Extracting all links from DOM`);
          const links = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a'));
            console.log(`Found ${allLinks.length} total links in the DOM`);
            
            return allLinks.map(a => {
              return {
                href: a.href,
                text: a.textContent?.trim() || '',
                title: a.getAttribute('title') || '',
                aria: a.getAttribute('aria-label') || ''
              };
            });
          });
          
          console.log(`[JobCrawler] Extracted ${links.length} links from page`);
          
          // Filter out invalid or non-HTTP links
          console.log(`[JobCrawler] Filtering links for valid URLs`);
          const validLinks = links.filter(link => 
            link.href && 
            (link.href.startsWith('http://') || link.href.startsWith('https://')) &&
            link.href !== url // Skip self-links
          );
          
          console.log(`[JobCrawler] Found ${validLinks.length} valid links after basic filtering`);
          
          if (validLinks.length === 0) {
            console.log(`[JobCrawler] No valid links found on page ${url}`);
            return;
          }
          
          // Log some example links for debugging
          console.log(`[JobCrawler] Example links from the page (up to 5):`);
          validLinks.slice(0, 5).forEach((link, i) => {
            console.log(`  ${i+1}. "${link.text}" -> ${link.href}`);
          });
          
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
            console.log(`[JobCrawler] Starting AI link analysis at ${new Date().toISOString()}`);
            
            // Show some of the filtered links we're sending to AI
            console.log(`[JobCrawler] Sample of links being sent to AI for analysis:`);
            filteredLinks.slice(0, 5).forEach((link, i) => {
              console.log(`  Link ${i+1}: "${link.text}" -> ${link.href}`);
            });
            
            try {
              // Use AI to identify which links are likely job listings
              console.log(`[JobCrawler] Sending ${filteredLinks.length} links to AI for analysis`);
              const aiResponse = await this.parser.analyzeLinks({
                sourceUrl: url,
                pageTitle: title,
                links: filteredLinks
              });
              
              console.log(`[JobCrawler] AI link analysis complete at ${new Date().toISOString()}`);
              console.log(`[JobCrawler] AI identified ${aiResponse.length} job-related links`);
              
              if (aiResponse.length > 0) {
                // Show the links AI identified as job postings
                console.log(`[JobCrawler] Links AI identified as job postings:`);
                aiResponse.forEach((jobUrl, i) => {
                  console.log(`  Job Link ${i+1}: ${jobUrl}`);
                });
                
                // Create a set of prioritized links
                const prioritizedUrls = new Set(aiResponse);
                
                // Enqueue the AI-selected links with high priority
                console.log(`[JobCrawler] Enqueueing AI-selected links with high priority`);
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
                
                console.log(`[JobCrawler] Finished enqueueing AI-selected links`);
                return; // Skip the standard enqueueing
              } else {
                console.log(`[JobCrawler] AI did not identify any job-related links, falling back to standard prioritization`);
              }
            } catch (error) {
              console.error('[JobCrawler] Error using AI to analyze links:', error);
              console.log('[JobCrawler] Falling back to standard link prioritization due to AI error');
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