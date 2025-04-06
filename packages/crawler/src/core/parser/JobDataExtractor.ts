// File path: packages/crawler/src/core/parser/JobDataExtractor.ts
import { JobPostingData, ParsePageInput } from '../../types';
import { Logger } from '../../utils/Logger';
import { AIService } from '@fedjobs/utils';
import { IHtmlCleaner } from './types';
import { HtmlCleaner } from './HtmlCleaner';

/**
 * Extracts job data from web page content
 */
export class JobDataExtractor {
  private aiService: AIService;
  private htmlCleaner: IHtmlCleaner;
  private logger: Logger;
  
  constructor(aiService?: AIService, htmlCleaner?: IHtmlCleaner) {
    this.aiService = aiService || new AIService();
    this.htmlCleaner = htmlCleaner || new HtmlCleaner();
    this.logger = new Logger('JobDataExtractor');
  }
  
  /**
   * Extract job listings from a webpage
   * @param input Page data to parse
   * @returns Array of job postings found on the page
   */
  public async extractJobListings(input: ParsePageInput): Promise<JobPostingData[]> {
    try { 
      const { url, content, title, description, keywords } = input;
      
      // Clean HTML to get text content
      const cleanedContent = this.htmlCleaner.cleanHtml(content);
      
      this.logger.info(`Parsing page: ${url}`);
      this.logger.info(`Page title: ${title}`);
      this.logger.info(`Content length: ${cleanedContent.length}`);
      
      // If content is too short, likely not a job page
      if (cleanedContent.length < 100) {
        this.logger.info(`Content too short, skipping parsing`);
        return [];
      }
      
      // Check if this looks like a job page
      const isLikelyJobPage = this.isLikelyJobPage(title, url);
      
      // Extract domain for context
      let domain = this.extractDomain(url);
      
      // Try to extract job links from the page
      const jobLinks = this.extractJobLinksFromHtml(content, url);
      
      // Prepare prompt for the AI
      const prompt = this.buildAIPrompt({
        url,
        domain,
        title,
        content: cleanedContent,
        isLikelyJobPage,
        jobLinks,
        keywords
      });
      
      // Call AI service to extract job data
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.2,
        maxTokens: 4000
      });
      
      return this.parseAIResponse(response, url, domain);
    } catch (error: unknown) {
      this.logger.error('Error in extractJobListings:', error as Record<string, any>);
      return [];
    }
  }
  
  /**
   * Check if a page is likely to be a job listing page
   */
  private isLikelyJobPage(title: string, url: string): boolean {
    const jobIndicators = [
      /job/i, /career/i, /position/i, /employment/i, /work/i, /hiring/i,
      /apply/i, /application/i, /vacancy/i, /opening/i, /opportunity/i
    ];
    
    return jobIndicators.some(pattern => pattern.test(title)) || 
           jobIndicators.some(pattern => pattern.test(url));
  }
  
  /**
   * Extract domain from a URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (error: unknown) {
      return url.split('/')[2] || '';
    }
  }
  
  /**
   * Extract job-related links from HTML content
   */
  private extractJobLinksFromHtml(content: string, baseUrl: string): string {
    try {
      const { load } = require('cheerio');
      const $ = load(content);
      const links = $('a')
        .map(function(this: any) {
          const href = $(this).attr('href');
          const text = $(this).text().trim();
          if (href && text && (
            /job|career|position|vacancy|apply|posting/i.test(href) || 
            /job|career|position|vacancy|apply|posting/i.test(text)
          )) {
            return `- "${text}": ${href}`;
          }
          return null;
        })
        .get()
        .filter(Boolean)
        .slice(0, 20) // Limit to 20 most relevant links
        .join('\n');
      
      if (links.length > 0) {
        return `\nPotential job-related links found on the page:\n${links}\n\nUse these links when possible as the 'url' field for each job.`;
      }
      return '';
    } catch (error: unknown) {
      this.logger.warn('Error extracting links:', error as Record<string, any>);
      return '';
    }
  }
  
  /**
   * Build prompt for AI job extraction
   */
  private buildAIPrompt(params: {
    url: string;
    domain: string;
    title: string;
    content: string;
    isLikelyJobPage: boolean;
    jobLinks: string;
    keywords?: string;
  }): string {
    const { url, domain, title, content, isLikelyJobPage, jobLinks, keywords } = params;
    
    let prompt = `
      Extract job listings from the following webpage content. The page is from ${url} with title "${title}" on the domain "${domain}".
      
      ${isLikelyJobPage ? 'This appears to be a job-related page based on its URL or title.' : ''}
      ${jobLinks}
      
      For each job posting you can identify, extract the following information in a structured format:
      - title: The job title
      - organization: The company or organization name (if not explicitly stated, use "${domain}" as a fallback)
      - location: The job location (if available)
      - description: A brief description of the job
      - salary: Salary information (if available)
      - requirements: Job requirements (if available)
      - url: The direct URL to the specific job posting (very important - if a specific job link exists, use that exact URL; if you can't find a specific URL, use the current page URL "${url}")
      - employmentType: The type of employment (use one of these values: FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, INTERNSHIP, REMOTE, HYBRID, or OTHER)
      
      If this appears to be a single job posting page (not a list of jobs), extract the information for that single job.
      
      If this page contains multiple job listings, extract information for each distinct job.
      
      Return the data as a JSON array of job objects. If no job listings are found, return an empty array.
      
      Webpage Content:
      ${content.slice(0, 12000)}
    `;
    
    if (keywords) {
      prompt += `\n\nFocus on jobs related to these keywords: ${keywords}`;
    }
    
    return prompt;
  }
  
  /**
   * Parse AI response into job posting data
   */
  private parseAIResponse(response: string, url: string, domain: string): JobPostingData[] {
    try {
      // Check for brackets to ensure it's JSON
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']');
      let jsonResponse = response;
      
      if (jsonStart > -1 && jsonEnd > -1) {
        jsonResponse = response.substring(jsonStart, jsonEnd + 1);
      }
      
      // Try to parse the response as JSON
      let responseObj;
      try {
        responseObj = JSON.parse(jsonResponse);
      } catch (e) {
        // If direct parsing fails, try to extract JSON from text
        const jsonMatch = jsonResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          responseObj = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON from response");
        }
      }
      
      const jobs: JobPostingData[] = Array.isArray(responseObj) 
        ? responseObj 
        : (responseObj?.jobs || responseObj?.jobListings || []);
      
      // Process each job to ensure it has proper URLs and metadata
      return jobs.map(job => {
        // For job URL handling
        let jobUrl = job.url;
        
        if (!jobUrl || jobUrl === '' || jobUrl === url) {
          // No specific URL was provided, use the current page URL
          jobUrl = url;
        } else if (!/^https?:\/\//i.test(jobUrl)) {
          // Convert relative URL to absolute
          jobUrl = this.convertRelativeToAbsoluteUrl(jobUrl, url);
        }
        
        return {
          ...job,
          url: jobUrl,
          dateScraped: new Date(),
          organization: job.organization || domain
        };
      });
    } catch (error: unknown) {
      this.logger.error('Error parsing AI response:', error as Record<string, any>);
      return [];
    }
  }
  
  /**
   * Convert a relative URL to an absolute URL
   */
  private convertRelativeToAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
    try {
      const base = new URL(baseUrl);
      if (relativeUrl.startsWith('/')) {
        // Absolute path
        return `${base.protocol}//${base.host}${relativeUrl}`;
      } else {
        // Relative path
        const pathParts = base.pathname.split('/');
        pathParts.pop(); // Remove last segment
        const basePath = pathParts.join('/');
        return `${base.protocol}//${base.host}${basePath}/${relativeUrl}`;
      }
    } catch (e) {
      // If URL parsing fails, fall back to the source URL
      return baseUrl;
    }
  }
}