// File: packages/utils/src/Services/AIService/index.ts

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIStreamOptions, GenerationParams, StreamResponse } from './types';

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
      this.openAIClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY_35 || '',
      });
    }
    return this.openAIClient;
  }
  
  /**
   * Get or initialize the Anthropic client
   */
  private getAnthropicClient(): Anthropic {
    if (!this.anthropicClient) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
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
            
            stream.on('content_block_delta', (delta: any) => {
              if (delta.delta.text) {
                fullCompletion += delta.delta.text;
                controller.enqueue(encoder.encode(delta.delta.text));
              }
            });
            
            stream.on('end', () => controller.close());
            stream.on('error', (err: any) => controller.error(err));
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
          console.error('Streaming error:', error);
          controller.error(error);
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
      if (provider === 'anthropic') {
        const client = this.getAnthropicClient();
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
        return '';
      } else {
        // OpenAI
        const client = this.getOpenAIClient();
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        });
        
        return response.choices[0]?.message?.content || '';
      }
    } catch (error) {
      console.error('Error generating text:', error);
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