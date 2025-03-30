// packages/utils/src/Services/JobCrawlerService/JobParser.ts
import { AIService } from '../AIService';
// @ts-ignore - cheerio is installed but TypeScript can't find types
import { load } from 'cheerio';
import { JobPostingData } from './types';

interface ParsePageInput {
  url: string;
  content: string;
  title: string;
  description: string;
  keywords?: string;
}

export class JobParser {
  private aiService: AIService;
  
  constructor() {
    this.aiService = new AIService();
  }
  
  private cleanHtml(html: string): string {
    // Load HTML into cheerio
    const $ = load(html);
    
    // Remove scripts, styles, and other non-content elements
    $('script, style, svg, img, iframe, noscript, head').remove();
    
    // Get text content
    return $('body').text().replace(/\s+/g, ' ').trim();
  }
  
  async parseJobsFromPage(input: ParsePageInput): Promise<JobPostingData[]> {
    try {
      const { url, content, title, description, keywords } = input;
      
      // Clean HTML to get text content
      const cleanedContent = this.cleanHtml(content);
      
      // Prepare prompt for the AI
      let prompt = `
        Extract job listings from the following webpage content. The page is from ${url} with title "${title}".
        
        For each job posting you can identify, extract the following information in a structured format:
        - title: The job title
        - organization: The company or organization name
        - location: The job location (if available)
        - description: A brief description of the job
        - salary: Salary information (if available)
        - requirements: Job requirements (if available)
        - url: The direct URL to the job posting (if it's a dedicated job page, use the current URL)
        - employmentType: The type of employment (e.g., FULL_TIME, PART_TIME, CONTRACT, etc.)
        
        Return the data as a JSON array of job objects. If no job listings are found, return an empty array.
        
        Webpage Content:
        ${cleanedContent.slice(0, 8000)} // Limit content length
      `;
      
      if (keywords) {
        prompt += `\n\nFocus on jobs related to these keywords: ${keywords}`;
      }
      
      // Call AI service to extract job data
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.2,
      });
      
      // Parse AI response
      try {
        const responseObj = JSON.parse(response);
        const jobs: JobPostingData[] = Array.isArray(responseObj) 
          ? responseObj 
          : (responseObj.jobs || responseObj.jobListings || []);
        
        // Add source URL if not present
        return jobs.map(job => ({
          ...job,
          url: job.url || url,
          dateScraped: new Date()
        }));
      } catch (err) {
        console.error('Error parsing AI response:', err);
        return [];
      }
    } catch (error) {
      console.error('Error in parseJobsFromPage:', error);
      return [];
    }
  }
  
  async enrichJobData(job: JobPostingData): Promise<JobPostingData> {
    try {
      // Prepare prompt for the AI
      const prompt = `
        Analyze this job posting and extract additional structured information:
        
        Job Title: ${job.title}
        Organization: ${job.organization}
        Location: ${job.location || 'Not specified'}
        Description: ${job.description}
        
        Extract and return the following in JSON format:
        1. skills: An array of key skills required for this job
        2. experienceLevel: Junior, Mid-level, Senior, or Executive
        3. benefits: Any mentioned benefits
        4. organizationType: Type of organization (GOVERNMENT, NONPROFIT, PRIVATE, etc.)
        5. keyResponsibilities: Main job responsibilities
        
        Return only the JSON object with these fields.
      `;
      
      // Call AI service to enrich job data
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.2,
        
      });
      
      // Parse AI response
      try {
        const enrichment = JSON.parse(response);
        return {
          ...job,
          skills: enrichment.skills || [],
          experience: enrichment.experienceLevel,
          benefits: enrichment.benefits,
          organizationType: enrichment.organizationType,
          structuredData: {
            ...(job.structuredData || {}),
            keyResponsibilities: enrichment.keyResponsibilities
          }
        };
      } catch (err) {
        console.error('Error parsing enrichment response:', err);
        return job;
      }
    } catch (error) {
      console.error('Error in enrichJobData:', error);
      return job;
    }
  }
}