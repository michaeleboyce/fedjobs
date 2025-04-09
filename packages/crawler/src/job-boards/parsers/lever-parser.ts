// packages/crawler/src/job-boards/parsers/lever-parser.ts
import cheerio from 'cheerio';
import { JobPostingData } from '../../types';
import { BaseJobBoardParser, JobBoardParseResult, JobBoardParserOptions } from '../base-job-board-parser';

export class LeverParser extends BaseJobBoardParser {
  constructor() {
    super('Lever');
  }

  canParse(url: string): boolean {
    return url.includes('lever.co');
  }

  async parse(options: JobBoardParserOptions): Promise<JobBoardParseResult> {
    const { url, content } = options;

    try {
      this.logger.info(`Parsing Lever page: ${url}`);

      // Extract company name from URL
      const companyName = this.extractCompanyName(url);

      // Load content with cheerio
      const $ = cheerio.load(content);

      // Check if this is a job listing page or a company jobs page
      // Specific job pages typically have a UUID-like segment (32-36 chars) at the end
      const isSpecificJob = /\/[a-f0-9-]{32,36}(?:\/|$)/i.test(url);

      if (isSpecificJob) {
        // This is a specific job listing
        return this.parseJobListing($, url, companyName);
      } else {
        // This is a company jobs page
        return this.parseCompanyPage($, url, companyName);
      }
    } catch (error) {
      this.logger.error(`Error parsing Lever page: ${error instanceof Error ? error.message : String(error)}`);
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private parseJobListing(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      // Extract job title - Lever typically uses .posting-headline h2
      const jobTitle = $('.posting-headline h2').text().trim() || $('h2').first().text().trim();

      // Extract job description
      const description = $('.posting-description').text().trim() || $('.content').text().trim();

      // Extract location - Lever typically puts this in .posting-headline .location
      const location = $('.posting-headline .location').text().trim() || $('.location').text().trim();

      // Extract job type - Lever typically puts this in .posting-headline .commitment
      const employmentType = $('.posting-headline .commitment').text().trim() || $('.commitment').text().trim();

      // Create job posting
      const job: JobPostingData = {
        title: jobTitle || 'Unknown Position',
        organization: companyName || 'Unknown Organization',
        description: description || $('body').text().trim(),
        url,
        location,
        employmentType,
        dateScraped: new Date(),
      };

      return { jobs: [job] };
    } catch (error) {
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private parseCompanyPage(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      const jobs: JobPostingData[] = [];

      // Lever uses div.posting for job listings on company pages
      const jobElements = $('.posting');

      if (jobElements.length) {
        this.logger.info(`Found ${jobElements.length} job listings`);

        jobElements.each((_, element) => {
          const el = $(element);

          // Extract job title
          const titleEl = el.find('h5');
          const jobTitle = titleEl.text().trim();

          // Extract job URL
          let jobUrl = '';
          const anchor = el.find('a');
          if (anchor.length) {
            jobUrl = anchor.attr('href') || '';
          }

          // Extract location
          const location = el.find('.location').text().trim();

          // Extract job type
          const employmentType = el.find('.commitment').text().trim();

          // Check for department/team
          const department = el.find('.team').text().trim();

          // Only add job if we have at least a title and URL
          if (jobTitle && jobUrl) {
            jobs.push({
              title: jobTitle,
              organization: companyName || 'Unknown Organization',
              description: el.text().trim(),
              url: jobUrl,
              location,
              employmentType,
              structuredData: department ? { department } : undefined,
              dateScraped: new Date(),
            });
          }
        });
      } else {
        // Fallback: Look for any links with job-like patterns
        const allLinks = $('a[href*="lever.co"]');
        allLinks.each((_, element) => {
          const anchor = $(element);
          const href = anchor.attr('href') || '';

          // Check if this is a job-specific link (has a UUID-like segment)
          if (/\/[a-f0-9-]{32,36}(?:\/|$)/i.test(href)) {
            jobs.push({
              title: anchor.text().trim() || 'Unknown Position',
              organization: companyName || 'Unknown Organization',
              description: '',
              url: href,
              dateScraped: new Date(),
            });
          }
        });
      }

      return { jobs };
    } catch (error) {
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get additional URLs to crawl from this page
   * Override the base implementation to handle Lever-specific URL patterns
   */
  getAdditionalUrlsToCrawl(url: string): string[] {
    try {
      // If this is a specific job page (contains a UUID-like segment)
      // also crawl the company page
      if (/\/[a-f0-9-]{32,36}(?:\/|$)/i.test(url)) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          // Company page URL
          return [`${urlObj.protocol}//${urlObj.host}/${pathParts[0]}`];
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}
