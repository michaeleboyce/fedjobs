// File path: packages/crawler/src/core/parser/JobEnricher.ts
import { JobPostingData } from '../../types';
import { Logger } from '../../utils/Logger';
import { AIService } from '@fedjobs/utils';

/**
 * Enriches job posting data with additional structured information
 */
export class JobEnricher {
  private aiService: AIService;
  private logger: Logger;
  
  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService();
    this.logger = new Logger('JobEnricher');
  }
  
  /**
   * Enrich job data with additional structured information
   * @param job Basic job data to enrich
   * @returns Enriched job data
   */
  public async enrichJobData(job: JobPostingData): Promise<JobPostingData> {
    try {
      // Prepare prompt for the AI
      const prompt = this.buildAIPrompt(job);
      
      // Call AI service to enrich job data
      const response = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.2,
        maxTokens: 1000
      });
      
      return this.parseAIResponse(job, response);
    } catch (error: any) {
      this.logger.error('Error in enrichJobData:', error);
      return job; // Return original job data if enrichment fails
    }
  }
  
  /**
   * Build prompt for AI enrichment
   */
  private buildAIPrompt(job: JobPostingData): string {
    return `
      Analyze this job posting and extract additional structured information:
      
      Job Title: ${job.title}
      Organization: ${job.organization}
      Location: ${job.location || 'Not specified'}
      Description: ${job.description}
      
      Extract and return the following in JSON format:
      1. skills: An array of key skills required for this job
      2. experienceLevel: Junior, Mid-level, Senior, or Executive
      3. benefits: Any mentioned benefits
      4. organizationType: Type of organization (use one of these values: GOVERNMENT, NONPROFIT, PRIVATE, PUBLIC, ACADEMIC, STARTUP, or OTHER)
      5. keyResponsibilities: Main job responsibilities
      
      Return only the JSON object with these fields.
    `;
  }
  
  /**
   * Parse AI response and merge with original job data
   */
  private parseAIResponse(originalJob: JobPostingData, response: string): JobPostingData {
    try {
      const jsonObj = this.extractJsonFromResponse(response);
      
      if (!jsonObj) {
        return originalJob;
      }
      
      return {
        ...originalJob,
        skills: jsonObj.skills || [],
        experience: jsonObj.experienceLevel,
        benefits: jsonObj.benefits,
        organizationType: jsonObj.organizationType,
        structuredData: {
          ...(originalJob.structuredData || {}),
          keyResponsibilities: jsonObj.keyResponsibilities
        }
      };
    } catch (error: unknown) {
      this.logger.error('Error parsing enrichment response:', error as Record<string, any>);
      return originalJob;
    }
  }
  
  /**
   * Extract JSON object from AI response text
   */
  private extractJsonFromResponse(response: string): any {
    try {
      // First try direct parsing
      try {
        return JSON.parse(response);
      } catch (e) {
        // If direct parsing fails, try to find JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Could not extract JSON from response");
      }
    } catch (error: unknown) {
      this.logger.error('Failed to extract JSON from response:', error as Record<string, any>);
      return null;
    }
  }
}