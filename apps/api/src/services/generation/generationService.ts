// apps/api/src/services/generation/generationService.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { GenerationRepository, GenerationRecord, NewGenerationRecord } from '@fedjobs/database';
import { DocumentType, GenerationType } from '@fedjobs/types';
import { config } from '../../config';
import { Transform } from 'stream';
import { BadRequestError } from '../../utils/errors';

/**
 * Type for document generation options
 */
export interface GenerationOptions {
  type: GenerationType;
  content: string;
  userId: string;
  prompt?: string;
  streaming?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Stream chunk type
 */
export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * Service for handling content generation
 */
export class GenerationService {
  private anthropic: Anthropic;

  /**
   * Create a new generation service
   */
  constructor(private generationRepo: GenerationRepository) {
    this.anthropic = new Anthropic({
      apiKey: config.auth.anthropicApiKey,
    });
  }

  /**
   * Generate content with streaming
   */
  public async generateWithStreaming(
    options: GenerationOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const {
      type,
      content,
      userId,
      prompt = content,
      temperature = 0,
      maxTokens = 4096,
    } = options;

    // Validate inputs
    if (!content) {
      throw new BadRequestError('Content is required');
    }

    const isParagraph = type === 'paragraph';
    
    // Create message from content/prompt
    const message = prompt || content;

    try {
      // Set up a stream from Anthropic
      const stream = await this.anthropic.messages.stream({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: message }],
      });

      // Create a transform stream to handle events
      let fullCompletion = '';
      const transformer = new TransformStream<string, Uint8Array>({
        transform(chunk, controller) {
          fullCompletion += chunk;
          controller.enqueue(new TextEncoder().encode(chunk));
        },
        flush(controller) {
          // Save the generation after completion
          this.saveGeneration(userId, type, isParagraph, message, fullCompletion, temperature)
            .catch(err => console.error('Error saving generation:', err));
          
          controller.terminate();
        }
      });

      // Handle content events
      const textDecoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          stream.on('text', (text: string) => {
            controller.enqueue(textDecoder.encode(text));
          });

          stream.on('end', () => {
            // Save generation when complete
            this.saveGeneration(userId, type, isParagraph, message, fullCompletion, temperature)
              .catch(err => console.error('Error saving generation:', err));
            
            controller.close();
          });

          stream.on('error', (err: Error) => {
            console.error('Stream error:', err);
            controller.error(err);
          });
        },
      });

      return readableStream;
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  /**
   * Save generation to database
   */
  private async saveGeneration(
    userId: string,
    type: GenerationType,
    isParagraph: boolean,
    prompt: string,
    completion: string,
    temperature: number
  ): Promise<void> {
    try {
      await this.generationRepo.insert({
        userId,
        type: type === 'paragraph' ? 'resume' : type, // Map paragraph to resume
        isParagraph,
        prompt,
        completion,
        temperature: temperature.toString(),
      });
    } catch (err) {
      console.error('Error saving generation:', err);
    }
  }

  /**
   * Generate content without streaming
   */
  public async generate(
    options: GenerationOptions
  ): Promise<{ content: string; type: DocumentType; userId: string }> {
    const {
      type,
      content,
      userId,
      prompt = content,
      temperature = 0,
      maxTokens = 4096,
    } = options;

    // Validate inputs
    if (!content) {
      throw new BadRequestError('Content is required');
    }

    const isParagraph = type === 'paragraph';
    const docType: DocumentType = isParagraph ? 'resume' : (type as DocumentType);
    
    try {
      // Generate completion
      const response = await this.anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract text from response
      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('Invalid response format from Claude');
      }

      const completion = textContent.text;

      // Save to database
      await this.generationRepo.insert({
        userId,
        type: docType,
        isParagraph,
        prompt,
        completion,
        temperature: temperature.toString(),
      });

      // Return the result
      return {
        content: completion,
        type: docType,
        userId,
      };
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  /**
   * Get generations by user ID
   */
  public async getByUserId(userId: string): Promise<GenerationRecord[]> {
    return this.generationRepo.getByUserId(userId);
  }
}