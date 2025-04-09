// packages/crawler/src/job-boards/parsers/ashby-parser.ts
import cheerio from 'cheerio';
import { JobPostingData } from '../../types';
import { BaseJobBoardParser, JobBoardParseResult, JobBoardParserOptions } from '../base-job-board-parser';

export class AshbyParser extends BaseJobBoardParser {
  constructor() {
    super('Ashby');
  }
  
  canParse(url: string): boolean {
    return url.includes('jobs.ashbyhq.com');
  }
  
  async parse(options: JobBoardParserOptions): Promise<JobBoardParseResult> {
    const { url, content } = options;
    
    try {
      this.logger.info(`Parsing Ashby page: ${url}`);
      
      const companyName = this.extractCompanyName(url);
      
      // Load content with cheerio
      const $ = cheerio.load(content);
      
      // Job listing URLs typically have a UUID-like identifier at the end
      const isSpecificJob = url.match(/\/[a-zA-Z0-9-]{36}$/);
      
      if (isSpecificJob) {
        return this.parseJobListing($, url, companyName);
      } else {
        return this.parseCompanyPage($, url, companyName);
      }
    } catch (error) {
      this.logger.error(`Error parsing Ashby page: ${error instanceof Error ? error.message : String(error)}`);
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  private parseJobListing(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      // Extract job title - typically in h1 or h2
      const jobTitle = $('h1').first().text().trim() || $('h2').first().text().trim();
      
      // Extract job description from common containers
      const descriptionSelectors = [
        '.job-description',
        '.description',
        '.posting-content',
        '#content',
        'article'
      ];
      let description = '';
      for (const selector of descriptionSelectors) {
        const el = $(selector);
        if (el.length) {
          description = el.text().trim();
          break;
        }
      }
      
      if (!description) {
        description = $('body').text().trim();
      }
      
      const locationSelectors = ['.location', '.job-location', '[data-field="location"]'];
      let location = '';
      for (const selector of locationSelectors) {
        const el = $(selector);
        if (el.length) {
          location = el.text().trim();
          break;
        }
      }
      
      const typeSelectors = ['.job-type', '.type', '.employment-type', '[data-field="type"]'];
      let employmentType = '';
      for (const selector of typeSelectors) {
        const el = $(selector);
        if (el.length) {
          employmentType = el.text().trim();
          break;
        }
      }
      
      const job: JobPostingData = {
        title: jobTitle || 'Unknown Position',
        organization: companyName || 'Unknown Organization',
        description: description,
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
  
  private parseCompanyPage(
    $: ReturnType<typeof cheerio.load>,
    url: string,
    companyName: string
  ): JobBoardParseResult {
    try {
      const jobs: JobPostingData[] = [];
      
      const jobListingSelectors = [
        '.job-posting', 
        '.job-item', 
        '.posting', 
        '[data-job-id]',
        'a[href*="/jobs/"]',
        'a[href*="ashbyhq.com"]'
      ];
      
      for (const selector of jobListingSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          this.logger.info(`Found ${elements.length} job listings with selector: ${selector}`);
          
          elements.each((_, element) => {
            const el = $(element);
            
            // Extract job title
            const titleEl = el.find('h2, h3, h4, .job-title, .title');
            const jobTitle = titleEl.text().trim();
            
            let jobUrl = '';
            if (el.is('a')) {
              jobUrl = el.attr('href') || '';
            } else {
              const anchor = el.find('a');
              jobUrl = anchor.attr('href') || '';
            }
            
            if (jobUrl && !jobUrl.startsWith('http')) {
              jobUrl = new URL(jobUrl, url).toString();
            }
            
            const locationEl = el.find('.location, .job-location');
            const location = locationEl.text().trim();
            
            const typeEl = el.find('.job-type, .type, .employment-type');
            const employmentType = typeEl.text().trim();
            
            if (jobTitle && jobUrl) {
              jobs.push({
                title: jobTitle,
                organization: companyName || 'Unknown Organization',
                description: el.text().trim(),
                url: jobUrl,
                location,
                employmentType,
                dateScraped: new Date()
              });
            }
          });
          
          if (jobs.length > 0) {
            break;
          }
        }
      }
      
      return { jobs };
    } catch (error) {
      return {
        jobs: [],
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
