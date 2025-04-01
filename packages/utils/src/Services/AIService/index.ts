// File path: packages/utils/src/Services/AIService/index.ts
// File: packages/utils/src/Services/AIService/index.ts

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { 
  AIProvider, 
  AIStreamOptions, 
  GenerationParams, 
  StreamResponse,
  ToolDefinition,
  ToolUseBlock,
  StructuredOutputResult
} from './types';
import { safeJsonParse } from './utils';

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
   * Generate structured output from AI models
   * 
   * This method uses the appropriate technique for structured output based on the model provider:
   * - For OpenAI: Uses the response_format parameter with json_object
   * - For Anthropic: Uses the tools parameter to implement function calling
   * 
   * @param params Generation parameters including model, prompt, schema
   * @returns Structured data parsed as specified type T
   */
  public async generateStructuredOutput<T = any>(
    params: {
      model: string;
      prompt: string;
      schema: object;
      temperature?: number;
      maxTokens?: number;
      toolName?: string;
      toolDescription?: string;
    }
  ): Promise<StructuredOutputResult<T>> {
    const { model, prompt, schema, temperature = 0, maxTokens = 4096, toolName = "generate_structured_output", toolDescription = "Generate structured data based on the provided schema" } = params;
    const provider = this.getProviderForModel(model);
    
    try {
      // Check if the model supports structured output
      this.validateModelForStructuredOutput(model, provider);
      
      if (provider === 'anthropic') {
        // Implement structured output using Anthropic's tool use pattern
        const client = this.getAnthropicClient();
        
        // Configure tool for structured output
        const tool: ToolDefinition = {
          name: toolName,
          description: toolDescription,
          input_schema: {
            type: 'object',
            properties: schema as Record<string, any>,
            required: Object.keys(schema as Record<string, any>)
          }
        };
        
        // Enhanced prompt to emphasize JSON correctness
        const enhancedPrompt = `${prompt}\n\nIMPORTANT: Ensure your response is properly formatted JSON that exactly matches the schema. All strings must be properly escaped, especially those containing quotes or special characters. All arrays and objects must be properly closed with matching brackets.`;
        
        // Make API call with tool definition
        const response = await client.messages.create({
          model,
          messages: [{ role: 'user', content: enhancedPrompt }],
          temperature,
          max_tokens: maxTokens,
          tools: [tool],
          tool_choice: { type: 'tool', name: toolName }
        });
        
        // Extract the tool_use content block
        const toolUseBlock = response.content.find(
          block => block.type === 'tool_use' && block.name === toolName
        ) as ToolUseBlock | undefined;
        
        if (!toolUseBlock) {
          throw new Error('Structured output generation failed: No tool use block returned');
        }
        
        // Return the structured data
        return {
          data: toolUseBlock.input as T,
          rawResponse: JSON.stringify(toolUseBlock.input)
        };
      } else {
        // Use OpenAI's response_format for structured output
        const client = this.getOpenAIClient();
        
        // Enhanced system message to emphasize proper JSON syntax
        const systemMessage = 'You must respond with valid JSON that conforms exactly to the provided schema. Pay special attention to proper JSON syntax: ensure all strings are properly escaped (especially those containing quotes or special characters), all arrays and objects are closed properly, and all required fields are included. Do not include any explanations, only the JSON output.';
        
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' }
        });
        
        const content = response.choices[0]?.message?.content || '';
        
        // Parse the JSON response with repair capability
        try {
          const parsedData = safeJsonParse<T>(content);
          return {
            data: parsedData,
            rawResponse: content
          };
        } catch (parseError) {
          console.error('Error parsing OpenAI structured output:', parseError);
          console.log('Problematic JSON content:', content.substring(0, 1000) + (content.length > 1000 ? '...' : ''));
          throw new Error(`Failed to parse JSON response: ${parseError}`);
        }
      }
    } catch (error) {
      console.error('Error generating structured output:', error);
      throw error;
    }
  }
  
  /**
   * Validate if the model supports structured output
   */
  private validateModelForStructuredOutput(model: string, provider: AIProvider): void {
    // List of models that support structured output
    const supportedOpenAIModels = [
      'gpt-4o', 'gpt-4o-2024-08-06', 'gpt-4o-mini-2024-07-18',
      'o1', 'o1-mini', 'o1-preview', 'o3-mini', 
      'gpt-4.5-preview-2025-02-27'
    ];
    
    const supportedAnthropicModels = [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307'
    ];
    
    if (provider === 'openai' && !supportedOpenAIModels.some(m => model.startsWith(m))) {
      throw new Error(`Model ${model} does not support structured output. Please use one of: ${supportedOpenAIModels.join(', ')}`);
    }
    
    if (provider === 'anthropic' && !supportedAnthropicModels.some(m => model.startsWith(m))) {
      throw new Error(`Model ${model} does not support structured output. Please use one of: ${supportedAnthropicModels.join(', ')}`);
    }
  }

  /**
   * Get available AI models grouped by provider
   */
  public getAvailableModels() {
    return {
      'openai': [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', supportsStructuredOutput: true },
        { id: 'o1', name: 'o1', provider: 'openai', supportsStructuredOutput: true },
        { id: 'o1-mini', name: 'o1-mini', provider: 'openai', supportsStructuredOutput: true },
        { id: 'o3-mini', name: 'o3-mini', provider: 'openai', supportsStructuredOutput: true },
        { id: 'o1-preview', name: 'o1-preview', provider: 'openai', supportsStructuredOutput: true },
      ],
      'anthropic': [
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', provider: 'anthropic', supportsStructuredOutput: true },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', supportsStructuredOutput: true },
      ]
    };
  }
}

// Create and export a singleton instance
export const aiService = new AIService();
export * from './types';