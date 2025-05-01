// File: packages/utils/src/Services/AIService/index.ts

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIStreamOptions, GenerationParams, StreamResponse } from './types';
import { redisService } from '../RedisService'; 
import crypto from 'crypto';
import dotenv from 'dotenv';


dotenv.config();

/**
 * Helper function to generate a unique cache key.
 */
function getCacheKey(model: string, prompt: string, jsonMode?: boolean): string {
  const modeSuffix = jsonMode ? ':json' : ':text';
  const hash = crypto.createHash('sha256').update(prompt + modeSuffix).digest('hex');
  return `ai-cache:${model}:${hash}`;
}

/**
 * Custom error class for AI service errors
 */
export class AIServiceError extends Error {
  public provider: AIProvider;
  public model: string;
  public statusCode?: number;
  public originalError?: any;
  public promptLength?: number;

  constructor(message: string, provider: AIProvider, model: string, originalError?: any) {
    super(message);
    this.name = 'AIServiceError';
    this.provider = provider;
    this.model = model;
    this.originalError = originalError;
    
    if (originalError?.status) {
      this.statusCode = originalError.status;
    } else if (originalError?.statusCode) {
      this.statusCode = originalError.statusCode;
    }
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Unified AI service that abstracts away the differences between AI providers
 */
export class AIService {
  private openAIClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  
  /**
   * Get or initialize the OpenAI client
   */
  private getOpenAIClient(): OpenAI {
    if (!this.openAIClient) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_35 || '';
      if (!apiKey) {
        console.warn('Warning: OPENAI_API_KEY is not set in environment variables');
      }
      
      this.openAIClient = new OpenAI({
        apiKey,
      });
    }
    return this.openAIClient;
  }
  
  /**
   * Get or initialize the Anthropic client
   */
  private getAnthropicClient(): Anthropic {
    if (!this.anthropicClient) {
      const apiKey = process.env.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        console.warn('Warning: ANTHROPIC_API_KEY is not set in environment variables');
      }
      
      this.anthropicClient = new Anthropic({
        apiKey,
      });
    }
    return this.anthropicClient;
  }
  
  /**
   * Determine the AI provider based on model name (Reinstated)
   */
  private getProviderForModel(model: string): AIProvider {
    if (model.toLowerCase().startsWith('claude')) {
      return 'anthropic';
    }
    return 'openai';
  }

  /**
   * Create a streaming response for text generation
   */
  public async createStreamingResponse(options: AIStreamOptions): Promise<StreamResponse> {
    const { model, prompt, temperature, maxTokens = 4096, jsonMode } = options;
    
    const provider = this.getProviderForModel(model);
    
    const finalPrompt = jsonMode ? `You MUST respond ONLY with valid JSON. Do not include any other text, explanations, or markdown formatting.\n\n${prompt}` : prompt;
    
    const encoder = new TextEncoder();
    let fullCompletion = '';
    
    const service = this;
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (provider === 'anthropic') {
            const client = service.getAnthropicClient();
            const stream = client.messages.stream({
              model: model,
              messages: [{ role: 'user', content: finalPrompt }],
              temperature: temperature ?? 0,
              max_tokens: maxTokens,
              stream: true,
            });
            
            stream.on('text', (text: string) => {
              fullCompletion += text;
              controller.enqueue(encoder.encode(text));
            });
            
            stream.on('end', () => controller.close());
            stream.on('error', (err: any) => {
              const serviceError = new AIServiceError(
                `Anthropic streaming error: ${err.message || String(err)}`,
                provider,
                model,
                err
              );
              serviceError.promptLength = finalPrompt.length;
              console.error('Anthropic streaming error:', {
                error: serviceError.message,
                model,
                provider,
                promptLength: serviceError.promptLength,
                statusCode: serviceError.statusCode,
              });
              controller.error(serviceError);
            });
          } else {
            const client = service.getOpenAIClient();
            const response = await client.chat.completions.create({
              model: model,
              messages: [{ role: 'user', content: finalPrompt }],
              temperature: temperature ?? 0,
              max_tokens: maxTokens,
              stream: true,
              ...(jsonMode && { response_format: { type: "json_object" } }),
            });
            
            for await (const chunk of response) {
              const content = chunk?.choices?.[0]?.delta?.content;
              if (content) {
                fullCompletion += content;
                controller.enqueue(encoder.encode(content));
              }
            }
            
            controller.close();
          }
        } catch (error) {
          const serviceError = new AIServiceError(
            `Streaming error with ${provider} model ${model}`,
            provider,
            model,
            error
          );
          serviceError.promptLength = finalPrompt.length;
          console.error('AI streaming error:', {
             error: serviceError.message,
             model,
             provider,
             promptLength: serviceError.promptLength,
             statusCode: serviceError.statusCode,
          });
          controller.error(serviceError);
        }
      }
    });
    
    return {
      stream: readableStream,
      getFullCompletion: () => fullCompletion,
    };
  }
  
  /**
   * Generate text without streaming (for short generations) with caching.
   */
  public async generateText(params: GenerationParams): Promise<string> {
    const { model, prompt, temperature = 0, maxTokens = 4096, jsonMode } = params;
    
    const provider = this.getProviderForModel(model);

    const finalPrompt = jsonMode ? `You MUST respond ONLY with valid JSON. Do not include any other text, explanations, or markdown formatting.\n\n${prompt}` : prompt;

    const requestId = Math.random().toString(36).substring(2, 10);

    const cacheKey = getCacheKey(model, finalPrompt, jsonMode);
    try {
      const cachedResult = await redisService.get(cacheKey);
      if (cachedResult !== null) {
        console.log(`[AI:${requestId}] Cache hit for key ${cacheKey}`);
        return cachedResult;
      }
      console.log(`[AI:${requestId}] Cache miss for key ${cacheKey}`);
    } catch (cacheError) {
      console.error(`[AI:${requestId}] Cache lookup failed for key ${cacheKey}:`, cacheError);
    }
    
    try {
      if (!finalPrompt) {
        throw new AIServiceError('Empty prompt provided to AI service', provider, model);
      }
      
      console.log(`Generating text using ${provider} model ${model} (${finalPrompt.length} chars)${jsonMode ? ' (JSON mode)' : ''}`);
      
      const startTime = Date.now();
      let result = '';
      
      if (provider === 'anthropic') {
        const client = this.getAnthropicClient();
        try {
          const response = await client.messages.create({
            model: model,
            messages: [{ role: 'user', content: finalPrompt }],
            temperature,
            max_tokens: maxTokens,
          });
          
          const elapsedTime = Date.now() - startTime;
          console.log(`[AI:${requestId}] ${provider} response received in ${elapsedTime}ms`);
          
          if (response.content && response.content.length > 0) {
            const textContent = response.content.filter(item => item.type === 'text');
            if (textContent.length > 0 && 'text' in textContent[0]) {
              result = textContent[0].text;
            } else {
              throw new AIServiceError('No text content in Anthropic response', provider, model);
            }
          } else {
            throw new AIServiceError('No content in Anthropic response', provider, model);
          }
        } catch (error) {
          const elapsedTime = Date.now() - startTime;
          console.error(`[AI:${requestId}] ${provider} error after ${elapsedTime}ms:`, error);
          throw new AIServiceError(
            `Anthropic API error: ${error instanceof Error ? error.message : String(error)}`,
            provider,
            model,
            error
          );
        }
      } else {
        const client = this.getOpenAIClient();
        try {
          const response = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: finalPrompt }],
            temperature,
            max_tokens: maxTokens,
            ...(jsonMode && { response_format: { type: "json_object" } }),
          });
          
          const elapsedTime = Date.now() - startTime;
          console.log(`[AI:${requestId}] ${provider} response received in ${elapsedTime}ms`);
          
          if (!response.choices || response.choices.length === 0) {
            throw new AIServiceError('No choices in OpenAI response', provider, model);
          }
          
          result = response.choices[0]?.message?.content || '';
        } catch (error) {
          const elapsedTime = Date.now() - startTime;
          console.error(`[AI:${requestId}] ${provider} error after ${elapsedTime}ms:`, error);
          throw new AIServiceError(
            `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
            provider,
            model,
            error
          );
        }
      }
      
      try {
        await redisService.set(cacheKey, result, 604800); 
        console.log(`[AI:${requestId}] Cached result under key ${cacheKey}`);
      } catch (cacheError) {
        console.error(`[AI:${requestId}] Redis caching failed for key ${cacheKey}:`, cacheError);
      }
      
      return result;
    } catch (error) {
      const serviceError = error instanceof AIServiceError ? error : new AIServiceError(
        `Error generating text: ${error instanceof Error ? error.message : String(error)}`,
        provider, 
        model, 
        error
      );
      
      if (!(error instanceof AIServiceError)) {
        serviceError.promptLength = finalPrompt?.length;
      }

      console.error(`[AI:${requestId}] Error generating text:`, {
        error: serviceError.message,
        provider: serviceError.provider,
        model: serviceError.model,
        promptLength: serviceError.promptLength,
        statusCode: serviceError.statusCode,
      });
      throw serviceError;
    }
  }

  /**
   * Get available AI models grouped by provider (Original hardcoded version)
   */
  public getAvailableModels() {
    return {
      'openai': [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      ],
      'anthropic': [
        { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
      ]
    };
  }
}

// Create and export a singleton instance
export const aiService = new AIService();
export * from './types';
