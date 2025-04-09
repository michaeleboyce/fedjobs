// packages/crawler/src/job-boards/parsers/custom-parser-template.ts
import cheerio from 'cheerio';
import { JobPostingData } from '../../types';
import { BaseJobBoardParser, JobBoardParseResult, JobBoardParserOptions } from '../base-job-board-parser';

/**
 * Template for creating a custom job board parser.
 * 
 * To use this template:
 * 1. Create a new file for your parser.
 * 2. Replace "Custom" with your parser name.
 * 3. Update the canParse method to detect your job board.
 * 4. Implement parse and other methods as needed.
 */
export class CustomJobBoardParser extends BaseJobBoardParser {
  constructor() {
    super('Custom');
  }
  
  canParse(url: string): boolean {
    return url.includes('example-job-board.com');
  }
  
  async parse(options: JobBoardParserOptions): Promise<JobBoardParseResult> {
    const { url, content } = options;
    
    try {
      this.logger.info(`Parsing custom job board page: ${url}`);
      
      // Extract company name from URL
      const companyName = this.extractCompanyName(url);
      
      // Load content with cheerio
      const $ = cheerio.load(content);
      
      // Example detection logic for a specific job page
      const isSpecificJob = this.isSpecificJobPage(url, $);
      
      if (isSpecificJob) {
        return this.parseJobListing($, url, companyName);
      } else {
        return this.parseJobListingsPage($, url, companyName);
      }
    } catch (error) {
      this.logger.error(`Error parsing custom job board page: ${error instanceof Error ? error.message : String(error)}`);
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  private isSpecificJobPage(url: string, $: ReturnType<typeof cheerio.load>): boolean {
    return url.includes('/job/') || $('.job-details').length > 0;
  }
  
  private parseJobListing(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      const jobTitle = $('.job-title').text().trim() || $('h1').first().text().trim();
      const description = $('.job-description').text().trim() || $('#content').text().trim();
      const location = $('.job-location').text().trim();
      const employmentType = $('.job-type').text().trim();
      
      const job: JobPostingData = {
        title: jobTitle || 'Unknown Position',
        organization: companyName || 'Unknown Organization',
        description: description || $('body').text().trim(),
        url,
        location,
        employmentType,
        dateScraped: new Date()
      };
      
      return { jobs: [job] };
    } catch (error) {
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  private parseJobListingsPage(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      const jobs: JobPostingData[] = [];
      
      const jobElements = $('.job-listing');
      
      jobElements.each((_, element) => {
        const el = $(element);
        const titleEl = el.find('.job-title');
        const jobTitle = titleEl.text().trim();
        
        let jobUrl = '';
        if (titleEl.is('a')) {
          jobUrl = titleEl.attr('href') || '';
        } else {
          const link = el.find('a');
          jobUrl = link.attr('href') || '';
        }
        
        if (jobUrl && !jobUrl.startsWith('http')) {
          jobUrl = new URL(jobUrl, url).toString();
        }
        
        const location = el.find('.location').text().trim();
        
        if (jobTitle && jobUrl) {
          jobs.push({
            title: jobTitle,
            organization: companyName || 'Unknown Organization',
            description: el.text().trim(),
            url: jobUrl,
            location,
            dateScraped: new Date()
          });
        }
      });
      
      return { jobs };
    } catch (error) {
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  getAdditionalUrlsToCrawl(url: string): string[] {
    try {
      if (url.includes('/job/')) {
        const urlObj = new URL(url);
        return [`${urlObj.protocol}//${urlObj.host}/jobs`];
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}
