import { AIService, AIServiceError } from '@fedjobs/utils';
import { Logger } from '../../utils/Logger';

/**
 * Specialized wrapper around AIService for link analysis
 * Provides enhanced logging and result parsing specific to link analysis
 */
export class LinkAIService {
  private aiService: AIService;
  private logger: Logger;
  
  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.logger = new Logger('LinkAIService');
  }
  
  /**
   * Generate text for link analysis with specialized logging
   * @param prompt The AI prompt containing links to analyze
   * @param sourceUrl The source URL where links were found
   * @returns The AI response text
   */
  async generateLinkAnalysis(prompt: string, sourceUrl: string): Promise<string> {
    const requestId = Math.random().toString(36).substring(2, 10);
    const linkCount = (prompt.match(/URL:/g) || []).length;
    
    this.logger.info(`[Request:${requestId}] Analyzing ${linkCount} links from ${sourceUrl}`);
    
    const startTime = Date.now();
    
    try {
      // Call the generic AI service
      const result = await this.aiService.generateText({
        prompt,
        model: "gpt-4o",
        temperature: 0.1,
        maxTokens: 2000
      });
      
      const elapsedTime = Date.now() - startTime;
      this.logger.info(`[Request:${requestId}] AI analysis completed in ${elapsedTime}ms`);
      
      // Analyze the result
      try {
        const match = result.match(/\[(.*?)\]/s);
        if (match) {
          const jsonArray = JSON.parse(match[0]);
          this.logger.info(`[Request:${requestId}] AI found ${jsonArray.length} job links out of ${linkCount} analyzed`);
        } else {
          this.logger.warn(`[Request:${requestId}] No JSON array found in AI response`);
        }
      } catch (e) {
        this.logger.error(`[Request:${requestId}] Error parsing JSON from response: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      return result;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      this.logger.error(`[Request:${requestId}] AI analysis failed after ${elapsedTime}ms: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
} 