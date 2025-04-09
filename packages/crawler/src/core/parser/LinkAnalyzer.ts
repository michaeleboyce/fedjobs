// File path: packages/crawler/src/core/parser/LinkAnalyzer.ts
import { AnalyzeLinksInput } from '../../types';
import { Logger } from '../../utils/Logger';
import { AIService } from '@fedjobs/utils';

/**
 * Analyzes links to determine which ones are likely job listings
 */
export class LinkAnalyzer {
  private aiService: AIService;
  private logger: Logger;
  
  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService();
    this.logger = new Logger('LinkAnalyzer');
  }
  
  /**
   * Analyze a batch of links to determine which ones are likely job listings
   * @param input Link analysis data
   * @returns Array of URLs that are likely job listings
   */
  public async analyzeLinks(input: AnalyzeLinksInput): Promise<string[]> {
    try {
      const { sourceUrl, pageTitle, links } = input;
      
      this.logger.info(`Analyzing ${links.length} links for ${sourceUrl}`);
      
      // Skip if no links
      if (!links || links.length === 0) {
        this.logger.info(`No links to analyze for ${sourceUrl}`);
        return [];
      }
      
      // Format links for AI analysis
      const linksFormatted = links.map((link, index) => {
        return `${index + 1}. URL: ${link.href}
   Text: ${link.text}
   Title: ${link.title || 'N/A'}
   Aria: ${link.aria || 'N/A'}`;
      }).join('\n\n');
      
      // Extract domain for context
      let domain = '';
      try {
        domain = new URL(sourceUrl).hostname.replace('www.', '');
      } catch (e) {
        domain = sourceUrl.split('/')[2] || '';
        this.logger.warn(`Error parsing URL ${sourceUrl}: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      // Prepare prompt for AI
      const prompt = this.buildAIPrompt(pageTitle, domain, sourceUrl, linksFormatted);
      this.logger.debug(`AI Prompt length: ${prompt.length} characters`);
      
      // Call AI service to analyze links
      let response;
      try {
        this.logger.info(`Calling AI service (model: gpt-4o) for link analysis on ${sourceUrl}`);
        response = await this.aiService.generateText({
          prompt,
          model: "gpt-4o",
          temperature: 0.1,
          maxTokens: 2000
        });
        this.logger.info(`AI service returned response of length: ${response?.length || 0} characters`);
      } catch (aiError: unknown) {
        // Detailed logging of AI service errors
        const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
        const errorDetails = aiError instanceof Error && aiError.stack ? aiError.stack : 'No stack trace available';
        
        this.logger.error(`AI service error during link analysis:`, {
          error: errorMessage,
          stack: errorDetails,
          sourceUrl,
          linkCount: links.length,
        });
        
        return [];
      }
      
      if (!response) {
        this.logger.error(`AI service returned empty response for ${sourceUrl}`);
        return [];
      }
      
      const parsedLinks = this.parseAIResponse(response);
      this.logger.info(`Identified ${parsedLinks.length} links as potential job listings from ${links.length} total links`);
      return parsedLinks;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error && error.stack ? error.stack : 'No stack trace available';
      
      this.logger.error('Error in analyzeLinks:', {
        error: errorMessage, 
        stack: errorDetails,
        sourceUrl: input?.sourceUrl || 'Unknown URL',
        linkCount: input?.links?.length || 0
      });
      
      return [];
    }
  }
  
  /**
   * Build the prompt for the AI service
   */
  private buildAIPrompt(pageTitle: string, domain: string, sourceUrl: string, linksFormatted: string): string {
    const cleanedSourceUrl = sourceUrl.replace('www.', '');
    return `
      You are a job posting identification expert. Analyze the following list of links from the page "${pageTitle}" on ${domain} (${cleanedSourceUrl}).
      
      Your task is to identify which links point to actual job listings or job description pages, not general career pages, job category pages, or non-job content.
      
      LINKS TO ANALYZE:
      ${linksFormatted}
      
      For each link, consider:
      1. Does the URL path contain job-specific keywords or patterns (like job IDs, position titles, etc.)?
      2. Does the link text describe a specific job position (e.g., "Senior Software Engineer" rather than "View All Jobs")?
      3. Is this likely a direct link to a specific job posting, not a category/filter/search page? WE DO NOT WANT CATEGORY/FILTER/SEARCH pages.

      Return ONLY the URL values for links that you are confident lead directly to specific job postings. 
      Return your answer as a JSON array of strings containing only the full URLs. Example format: ["https://example.com/jobs/12345", "https://example.com/careers/senior-developer"]
      
      If none of the links appear to be direct job postings, return an empty array: []
    `;
  }
  
  /**
   * Parse the AI response into an array of URLs
   */
  private parseAIResponse(response: string): string[] {
    try {
      // Find JSON array in the response
      const match = response.match(/\[.*?\]/s);
      if (match) {
        try {
          const jsonResponse = JSON.parse(match[0]);
          
          // Validate each URL
          const validUrls = jsonResponse.filter((url: any) => 
            typeof url === 'string' && 
            (url.startsWith('http://') || url.startsWith('https://'))
          );
          
          return validUrls;
        } catch (jsonError) {
          this.logger.error(`Error parsing AI response JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
          this.logger.debug(`Raw response content: ${response.substring(0, 200)}...`);
          return [];
        }
      }
      
      this.logger.warn(`No JSON array found in AI response. Raw response begins with: ${response.substring(0, 100)}...`);
      return [];
    } catch (error: unknown) {
      this.logger.error(`Error parsing AI response for link analysis: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.debug(`Raw response content: ${response.substring(0, 200)}...`);
      return [];
    }
  }
}