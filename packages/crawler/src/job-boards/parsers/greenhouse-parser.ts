// packages/crawler/src/job-boards/parsers/greenhouse-parser.ts
import cheerio from 'cheerio';
import { URL } from 'url'; // Import URL for robust URL handling
import { JobPostingData } from '../../types';
import { BaseJobBoardParser, JobBoardParseResult, JobBoardParserOptions } from '../base-job-board-parser';

export class GreenhouseParser extends BaseJobBoardParser {
  constructor() {
    super('Greenhouse');
  }

  /**
   * Checks if the URL is likely a Greenhouse job board URL.
   * @param url - The URL to check.
   * @returns True if the URL includes 'greenhouse.io', false otherwise.
   */
  canParse(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Check if the hostname includes greenhouse.io or boards.greenhouse.io
      return parsedUrl.hostname.endsWith('greenhouse.io');
    } catch (error) {
      this.logger.warn(`Invalid URL provided to canParse: ${url}`);
      return false;
    }
  }

  /**
   * Parses the HTML content of a Greenhouse job board page (either a company list or a specific job).
   * @param options - Options including the URL and HTML content.
   * @returns A JobBoardParseResult containing found jobs or an error.
   */
  async parse(options: JobBoardParserOptions): Promise<JobBoardParseResult> {
    const { url, content } = options;

    try {
      this.logger.info(`Attempting to parse Greenhouse page: ${url}`);

      // Load content with cheerio
      const $ = cheerio.load(content);

      // Extract company name from URL or page title/meta tags as fallback
      const companyName = this.extractCompanyName(url);
      this.logger.info(`Extracted company name: ${companyName || 'Unknown'}`);

      // Check if the URL path indicates a specific job listing
      const isSpecificJob = /\/jobs\/\d+/.test(new URL(url).pathname);
      this.logger.info(`URL path indicates specific job: ${isSpecificJob}`);

      if (isSpecificJob) {
        this.logger.info(`Parsing as specific job listing: ${url}`);
        return this.parseJobListing($, url, companyName);
      } else {
        this.logger.info(`Parsing as company/department page: ${url}`);
        return this.parseCompanyPage($, url, companyName);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error parsing Greenhouse page ${url}: ${errorMessage}`, error as Record<string, any>);
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }
  }

  /**
   * Parses a specific job listing page.
   * @param $ - Cheerio instance for the page content.
   * @param url - The URL of the job listing page.
   * @param companyName - The extracted name of the company.
   * @returns A JobBoardParseResult containing the single job found or an error.
   */
  private parseJobListing(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      // --- Updated Selectors based on the Anthropic Economist example ---
      const jobTitle = $('.job__title h1.section-header').text().trim() || $('h1:first').text().trim();
      const location = $('.job__location div').text().trim();
      // Get the main description container's text content
      const jobDescription = $('.job__description.body').text().trim();
      // --- End Updated Selectors ---

      // Fallback if main description selector fails
      const fallbackDescription = jobDescription || $('#content').text().trim() || $('.main').text().trim() || $('body').text().trim();

      // Employment type is often not consistently available or structured
      const employmentType = undefined; // Set to undefined as it's unreliable

      if (!jobTitle) {
        this.logger.warn(`Could not extract job title from ${url}`);
        // Optionally return an error or an empty result if title is essential
        // return { jobs: [], error: new Error('Job title not found') };
      }

      const job: JobPostingData = {
        title: jobTitle || 'Unknown Position', // Use fallback title
        organization: companyName || 'Unknown Organization', // Use fallback organization
        description: fallbackDescription,
        url, // The URL of the specific job page itself
        location: location || undefined, // Set to undefined if empty
        employmentType,
        dateScraped: new Date()
      };

      this.logger.success(`Successfully parsed job listing: "${job.title}" at ${job.organization}`);
      return { jobs: [job] };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error parsing specific job listing ${url}: ${errorMessage}`, error as Record<string, any>);
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }
  }

  /**
   * Parses a company or department page listing multiple jobs.
   * @param $ - Cheerio instance for the page content.
   * @param url - The URL of the company/department page.
   * @param companyName - The extracted name of the company.
   * @returns A JobBoardParseResult containing the list of jobs found or an error.
   */
  private parseCompanyPage(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      const jobs: JobPostingData[] = [];
      let foundJobs = false;

      // --- Updated Selector based on Anthropic jobs list example ---
      const primaryJobSelector = 'tr.job-post';
      const jobElements = $(primaryJobSelector);
      // --- End Updated Selector ---

      if (jobElements.length > 0) {
        this.logger.info(`Found ${jobElements.length} job listings using primary selector: ${primaryJobSelector}`);
        foundJobs = true;

        jobElements.each((_, el) => {
          const element = $(el);
          const linkElement = element.find('a');

          // --- Updated Extraction Logic ---
          const jobTitle = linkElement.find('p.body--medium').text().trim();
          const jobUrlRaw = linkElement.attr('href');
          const location = linkElement.find('p.body__secondary.body--metadata').text().trim();
          // --- End Updated Extraction Logic ---

          if (jobTitle && jobUrlRaw) {
            let jobUrl: string;
            try {
              // Resolve relative URLs against the base page URL
              jobUrl = new URL(jobUrlRaw, url).toString();
            } catch (e) {
              this.logger.warn(`Could not resolve job URL: ${jobUrlRaw} relative to ${url}. Skipping job: ${jobTitle}`);
              return; // Continue to next iteration
            }

            jobs.push({
              title: jobTitle,
              organization: companyName || 'Unknown Organization',
              // Use a minimal description for list items, or leave empty
              description: `${jobTitle} at ${companyName || 'company'} in ${location || 'location'}`,
              url: jobUrl,
              location: location || undefined,
              dateScraped: new Date()
            });
          } else {
            this.logger.warn(`Missing title or URL for a job listing on ${url}. Element text: ${element.text().substring(0, 100)}...`);
          }
        });
      }

      // Fallback: If primary selector didn't find jobs, try the old selectors or link keyword search
      if (!foundJobs) {
        this.logger.info(`Primary selector "${primaryJobSelector}" found no jobs. Trying fallback methods.`);
        const fallbackSelectors = [
          '.opening', '.posting', '.job', '[data-qa="job-board-posting"]', 'section.level-0', 'div.job'
        ];

        for (const selector of fallbackSelectors) {
          const elements = $(selector);
          if (elements.length) {
            this.logger.info(`Found ${elements.length} job listings with fallback selector: ${selector}`);
            elements.each((_, el) => {
              const element = $(el);
              let titleElement = element.find('a');
              if (!titleElement.length) {
                titleElement = element.find('h3, h4'); // Common heading tags
              }
              const jobTitle = titleElement.text().trim();
              let jobUrlRaw = titleElement.is('a') ? titleElement.attr('href') : element.find('a').attr('href');
              const location = element.find('.location').text().trim(); // Standard Greenhouse location class

              if (jobTitle && jobUrlRaw) {
                let jobUrl: string;
                try {
                  jobUrl = new URL(jobUrlRaw, url).toString();
                } catch (e) {
                  this.logger.warn(`Could not resolve fallback job URL: ${jobUrlRaw} relative to ${url}. Skipping job: ${jobTitle}`);
                  return;
                }
                jobs.push({
                  title: jobTitle,
                  organization: companyName || 'Unknown Organization',
                  description: element.text().trim().substring(0, 200) + '...', // Snippet
                  url: jobUrl,
                  location: location || undefined,
                  dateScraped: new Date()
                });
              }
            });
            foundJobs = true;
            break; // Stop after first successful fallback selector
          }
        }
      }

      // Final Fallback: Search all links for job-related keywords if still no jobs found
      if (!foundJobs && jobs.length === 0) {
         this.logger.info(`No jobs found with primary or fallback selectors. Trying keyword link search.`);
         const allLinks = $('a');
         allLinks.each((_, el) => {
           const link = $(el);
           const linkText = link.text().trim();
           const href = link.attr('href');
           const jobKeywords = ['job', 'career', 'position', 'opening', 'role', 'vacancy'];
           const isJobLink = jobKeywords.some(keyword =>
             linkText.toLowerCase().includes(keyword) || (href && href.toLowerCase().includes(keyword))
           );

           // Ensure it looks like a job link and potentially has a job ID structure
           if (isJobLink && href && (href.includes('/jobs/') || href.includes('/careers/') || href.includes('/openings/'))) {
             let jobUrl: string;
             try {
               jobUrl = new URL(href, url).toString();
               // Avoid adding duplicates or the page itself
               if (jobUrl !== url && !jobs.some(j => j.url === jobUrl)) {
                 jobs.push({
                   title: linkText || 'Job Opening',
                   organization: companyName || 'Unknown Organization',
                   description: `Link found on ${url}`,
                   url: jobUrl,
                   dateScraped: new Date()
                 });
               }
             } catch (e) {
                this.logger.warn(`Could not resolve final fallback job URL: ${href} relative to ${url}. Skipping.`);
             }
           }
         });
         if (jobs.length > 0) {
            this.logger.info(`Found ${jobs.length} potential job links via keyword search.`);
         }
      }


      if (jobs.length === 0) {
        this.logger.warn(`No job listings found on company page: ${url}`);
      } else {
        this.logger.success(`Successfully parsed ${jobs.length} jobs from company page: ${url}`);
      }

      return { jobs };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error parsing company page ${url}: ${errorMessage}`, error as Record<string, any>);
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }
  }

  /**
   * Extracts the company name, prioritizing URL structure, then meta tags, then title tag.
   * @param url - The URL of the page.
   * @returns The extracted company name or a default value.
   */
  protected extractCompanyName(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean); // Remove empty parts

      // 1. Try extracting from the first path part (e.g., boards.greenhouse.io/anthropic/...)
      if (pathParts.length > 0 && pathParts[0] !== 'jobs') {
         // Simple capitalization for display
         const nameFromPath = pathParts[0];
         return nameFromPath.charAt(0).toUpperCase() + nameFromPath.slice(1);
      }

      // 2. Fallback: Use the domain name part before greenhouse.io (e.g., 'boards' from boards.greenhouse.io) - less ideal
      const domainParts = parsedUrl.hostname.split('.');
      if (domainParts.length > 2 && domainParts[domainParts.length - 2] === 'greenhouse' && domainParts[domainParts.length - 1] === 'io') {
         const potentialName = domainParts[domainParts.length - 3];
         // Avoid generic subdomains like 'boards' or 'jobs' if possible
         if (potentialName && !['boards', 'jobs', 'www'].includes(potentialName)) {
            return potentialName.charAt(0).toUpperCase() + potentialName.slice(1);
         }
      }

    } catch (error) {
      this.logger.warn(`Could not extract company name from URL ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Final fallback
    return 'Unknown Company';
  }


  /**
   * Suggests additional URLs to crawl, specifically the main company board page if currently on a job page.
   * @param url - The current URL being parsed.
   * @returns An array containing the potential company board URL, or an empty array.
   */
  getAdditionalUrlsToCrawl(url: string): string[] {
    try {
      const parsedUrl = new URL(url);
      // If the path contains '/jobs/' followed by a number, suggest the base path
      if (/\/jobs\/\d+/.test(parsedUrl.pathname)) {
        const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && pathParts[pathParts.length - 2] === 'jobs') {
          // Construct URL up to the part before '/jobs/' (e.g., https://boards.greenhouse.io/anthropic)
          const companyBoardPath = '/' + pathParts.slice(0, -2).join('/');
          const companyBoardUrl = `${parsedUrl.protocol}//${parsedUrl.host}${companyBoardPath}`;
          this.logger.info(`Suggesting navigation from job page ${url} to company page ${companyBoardUrl}`);
          return [companyBoardUrl];
        }
      }
    } catch (error) {
       this.logger.warn(`Error processing URL for additional crawl suggestions ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Otherwise, no suggestions
    return [];
  }
}