// File path: packages/utils/src/Services/AIService/index.ts
// File: packages/utils/src/Services/AIService/index.ts

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIStreamOptions, GenerationParams, StreamResponse } from './types';

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
    
    // Extract status code if available
    if (originalError?.status) {
      this.statusCode = originalError.status;
    } else if (originalError?.statusCode) {
      this.statusCode = originalError.statusCode;
    }
    
    // Capture stack trace
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
      const apiKey = process.env.OPENAI_API_KEY_35 || '';
      if (!apiKey) {
        console.warn('Warning: OPENAI_API_KEY_35 is not set in environment variables');
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
   * Determine the AI provider based on model name
   */
  private getProviderForModel(model: string): AIProvider {
    if (model.startsWith('claude')) {
      return 'anthropic';
    }
    return 'openai';
  }
  
  /**
   * Create a streaming response for text generation
   */
  public async createStreamingResponse(options: AIStreamOptions): Promise<StreamResponse> {
    const { model, prompt, temperature, maxTokens } = options;
    const provider = this.getProviderForModel(model);
    
    const encoder = new TextEncoder();
    let fullCompletion = '';
    
    // Store service instance to use in callbacks
    const service = this;
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          if (provider === 'anthropic') {
            const client = service.getAnthropicClient();
            const stream = client.messages.stream({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: temperature || 0,
              max_tokens: maxTokens || 4096,
              stream: true,
            });
            
            // Handle all possible stream events
            stream.on('text', (text: string) => {
              fullCompletion += text;
              controller.enqueue(encoder.encode(text));
            });
            
            stream.on('end', () => controller.close());
            stream.on('error', (err: any) => {
              console.error('Anthropic streaming error:', {
                error: err.message || String(err),
                model,
                provider,
                promptLength: prompt.length,
              });
              controller.error(err);
            });
          } else {
            // OpenAI
            const client = service.getOpenAIClient();
            const response = await client.chat.completions.create({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: temperature || 0,
              max_tokens: maxTokens || 4096,
              stream: true,
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
          const errorDetails = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            model,
            provider,
            promptLength: prompt.length,
          };
          
          console.error('AI streaming error:', errorDetails);
          controller.error(new AIServiceError(
            `Streaming error with ${provider} model ${model}`,
            provider,
            model,
            error
          ));
        }
      }
    });
    
    return {
      stream: readableStream,
      getFullCompletion: () => fullCompletion,
    };
  }
  
  /**
   * Generate text without streaming (for short generations)
   */
  public async generateText(params: GenerationParams): Promise<string> {
    const { model, prompt, temperature = 0, maxTokens = 4096 } = params;
    const provider = this.getProviderForModel(model);
    
    try {
      // Check for empty or undefined prompt
      if (!prompt) {
        throw new AIServiceError('Empty prompt provided to AI service', provider, model);
      }
      
      console.log(`Generating text using ${provider} model ${model} (${prompt.length} chars)`);
      
      if (provider === 'anthropic') {
        const client = this.getAnthropicClient();
        try {
          const response = await client.messages.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens,
          });
          
          // Handle different content types safely
          if (response.content && response.content.length > 0) {
            const textContent = response.content.filter(item => item.type === 'text');
            if (textContent.length > 0 && 'text' in textContent[0]) {
              return textContent[0].text;
            }
          }
          throw new AIServiceError('No text content in Anthropic response', provider, model);
        } catch (error) {
          // Wrap Anthropic-specific errors with our custom error
          throw new AIServiceError(
            `Anthropic API error: ${error instanceof Error ? error.message : String(error)}`,
            provider,
            model,
            error
          );
        }
      } else {
        // OpenAI
        const client = this.getOpenAIClient();
        try {
          const response = await client.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens: maxTokens,
          });
          
          if (!response.choices || response.choices.length === 0) {
            throw new AIServiceError('No choices in OpenAI response', provider, model);
          }
          
          return response.choices[0]?.message?.content || '';
        } catch (error) {
          // Wrap OpenAI-specific errors with our custom error
          throw new AIServiceError(
            `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
            provider,
            model,
            error
          );
        }
      }
    } catch (error) {
      // Make sure the AIServiceError includes the prompt length for debugging
      if (error instanceof AIServiceError) {
        error.promptLength = prompt.length;
      }
      
      // Log detailed error information
      console.error('Error generating text:', {
        error: error instanceof Error ? error.message : String(error),
        provider,
        model,
        promptLength: prompt.length,
        statusCode: error instanceof AIServiceError ? error.statusCode : undefined,
      });
      
      // Rethrow for proper handling upstream
      throw error;
    }
  }
  
  /**
   * Get available AI models grouped by provider
   */
  public getAvailableModels() {
    return {
      'openai': [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
        { id: 'o1', name: 'o1', provider: 'openai' },
        { id: 'o1-mini', name: 'o1-mini', provider: 'openai' },
        { id: 'o3-mini', name: 'o3-mini', provider: 'openai' },
        { id: 'o1-preview', name: 'o1-preview', provider: 'openai' },
      ],
      'anthropic': [
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
      ]
    };
  }
}

// Create and export a singleton instance
export const aiService = new AIService();
export * from './types';