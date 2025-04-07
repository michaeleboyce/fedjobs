// File path: packages/crawler/src/domain/job-posting.validator.ts
import { JobPostingData } from '../types';
import { AIService } from '@fedjobs/utils';
import { Logger } from '../utils/Logger';

/**
 * Result of job validation
 */
export interface ValidationResult {
  isValid: boolean;
  reasons?: string[];
}

/**
 * Validates job postings to ensure they are legitimate
 */
export class JobPostingValidator {
  private logger = new Logger('JobPostingValidator');
  private aiService: AIService;
  
  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService();
  }
  
  /**
   * Validate that a job posting is legitimate
   * @param jobData Job data to validate
   * @returns Validation result with reason if invalid
   */
  async validateJob(jobData: JobPostingData): Promise<ValidationResult> {
    try {
      // Check for minimum required fields
      if (!jobData.title || !jobData.organization || !jobData.description) {
        return { 
          isValid: false, 
          reasons: this.getMissingFieldReasons(jobData)
        };
      }
      
      // Check for minimum description length
      if (jobData.description.length < 50) {
        return { isValid: false, reasons: ['Job description too short'] };
      }
      
      // Check for suspicious titles
      if (this.hasSuspiciousTitle(jobData.title)) {
        return { 
          isValid: false, 
          reasons: ['Suspicious job title indicates this is not a job posting'] 
        };
      }
      
      // Use AI for advanced validation when necessary
      if (this.needsAdvancedValidation(jobData)) {
        return await this.performAIValidation(jobData);
      }
      
      return { isValid: true };
    } catch (error) {
      this.logger.error('Error validating job posting:', error as Record<string, any>);
      // Default to valid if validation fails to prevent blocking legitimate jobs
      return { isValid: true };
    }
  }
  
  /**
   * Get reasons for missing required fields
   * @private
   */
  private getMissingFieldReasons(jobData: JobPostingData): string[] {
    const reasons = ['Missing required fields'];
    
    if (!jobData.title) reasons.push('No job title');
    if (!jobData.organization) reasons.push('No organization');
    if (!jobData.description) reasons.push('No job description');
    
    return reasons;
  }
  
  /**
   * Check if a job title is suspicious
   * @private
   */
  private hasSuspiciousTitle(title: string): boolean {
    const suspiciousTitlePatterns = [
      /404 not found/i,
      /home page/i,
      /welcome/i,
      /index/i,
      /login/i,
      /sign[ -]?in/i,
      /register/i,
      /about us/i,
      /privacy/i,
      /terms/i
    ];
    
    return suspiciousTitlePatterns.some(pattern => pattern.test(title));
  }
  
  /**
   * Determine if a job needs advanced AI validation
   * @private
   */
  private needsAdvancedValidation(jobData: JobPostingData): boolean {
    // Add logic to determine when to use AI validation
    // For example, if the job title and description seem ambiguous
    
    // Generic job titles that might need further verification
    const genericTitles = [
      /position/i,
      /opportunity/i,
      /opening/i,
      /vacancy/i,
      /role/i,
      /job/i
    ];
    
    // Short descriptions might need verification
    const hasShortDescription = jobData.description.length < 200;
    
    // Check for generic titles
    const hasGenericTitle = genericTitles.some(pattern => pattern.test(jobData.title));
    
    return hasShortDescription || hasGenericTitle;
  }
  
  /**
   * Perform AI-based validation
   * @private
   */
  private async performAIValidation(jobData: JobPostingData): Promise<ValidationResult> {
    const prompt = `
      Determine if the following content is a legitimate job posting. Analyze the title, organization, and description.

      Title: ${jobData.title}
      Organization: ${jobData.organization}
      ${jobData.location ? `Location: ${jobData.location}` : ''}
      
      Description snippet: ${jobData.description.substring(0, 500)}...
      
      A legitimate job posting typically:
      1. Has a specific job title (not generic page titles like "Home", "About Us", etc.)
      2. Describes specific responsibilities, requirements, or qualifications
      3. Mentions employment details such as job type, hours, or compensation
      4. Has a professional tone consistent with job advertisements
      
      Return a JSON object with:
      {
        "isLegitimateJob": true/false,
        "confidence": 0-1 (how confident you are in this assessment),
        "reasons": ["list", "of", "reasons", "for", "your", "decision"]
      }
    `;
    
    try {
      const aiResponse = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.1,
        maxTokens: 1000
      });
      
      // Parse the AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        
        if (!validation.isLegitimateJob && validation.confidence > 0.7) {
          this.logger.info(`AI determined content is not a legitimate job (${(validation.confidence*100).toFixed(1)}% confident)`);
          return { 
            isValid: false, 
            reasons: validation.reasons || ['AI determined this is not a legitimate job posting'] 
          };
        }
      }if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        
        if (!validation.isLegitimateJob && validation.confidence > 0.7) {
          this.logger.info(`AI determined content is not a legitimate job (${(validation.confidence*100).toFixed(1)}% confident)`);
          return { 
            isValid: false, 
            reasons: validation.reasons || ['AI determined this is not a legitimate job posting'] 
          };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      this.logger.error('Error parsing AI validation response:', error as Record<string, any>);
      // Default to valid if AI validation fails
      return { isValid: true };
    }
  }
}