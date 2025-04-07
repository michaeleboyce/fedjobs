// apps/api/src/controllers/generationController.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { GenerationService } from '../services/generation/generationService';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';
import { DocumentType, isGenerationType } from '@fedjobs/types';

/**
 * Validation schema for generation request
 */
const GenerateRequestSchema = z.object({
  type: z.string().refine(isGenerationType, {
    message: "Invalid generation type",
  }),
  content: z.string(),
  userId: z.string(),
  prompt: z.string().optional(),
  streaming: z.boolean().optional().default(false),
  temperature: z.number().optional().default(0),
  maxTokens: z.number().optional().default(4096),
});

/**
 * Controller for generation-related endpoints
 */
export class GenerationController {
  /**
   * Create a new generation controller
   */
  constructor(private generationService: GenerationService) {}

  /**
   * Generate content
   */
  public generate = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = GenerateRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request body', validation.error.format());
    }

    // Extract validated data
    const {
      type,
      content,
      userId,
      prompt,
      streaming = false,
      temperature = 0,
      maxTokens = 4096,
    } = validation.data;

    // Handle streaming response
    if (streaming) {
      // Set up headers for event stream
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        // Generate streaming response
        const stream = await this.generationService.generateWithStreaming({
          type,
          content,
          userId,
          prompt,
          streaming,
          temperature,
          maxTokens,
        });

        // Pipe stream to response
        const reader = stream.getReader();
        
        // Read until done
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          // Create SSE message
          const text = new TextDecoder().decode(value);
          const eventData = JSON.stringify({ content: text, done: false });
          res.write(`data: ${eventData}\n\n`);
        }
        
        // Send completion message
        res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
        res.end();
      } catch (error) {
        // If streaming fails, attempt to close gracefully
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Streaming failed', done: true })}\n\n`);
        res.end();
      }
    } else {
      // Generate without streaming
      const result = await this.generationService.generate({
        type,
        content,
        userId,
        prompt,
        streaming,
        temperature,
        maxTokens,
      });
      
      // Return the result
      res.json(result);
    }
  });

  /**
   * Get generations by user ID
   */
  public getGenerationsByUserId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      throw new BadRequestError('userId is required');
    }
    
    const generations = await this.generationService.getByUserId(userId);
    res.json(generations);
  });
}