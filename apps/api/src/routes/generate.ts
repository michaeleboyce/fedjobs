import express, { Router, Request, Response, NextFunction } from 'express';
import { GenerateRequestSchema, type GenerateRequest } from '../types';
import { ApiError } from '../middleware/error';
import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '../config';

const router: Router = express.Router();
const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

router.post('/', async (
  req: Request<{}, {}, GenerateRequest>, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const validation = GenerateRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(400, 'Invalid request body');
    }

    const { type, content, userId, streaming = false } = validation.data;

    if (streaming) {
      const stream = await anthropic.messages.create({
        messages: [{ role: 'user', content }],
        model: 'claude-3-sonnet-20240229',
        stream: true,
        max_tokens: 4096,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
          res.write(`data: ${JSON.stringify({
            content: chunk.delta.text,
            done: false
          })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      res.end();
    } else {
      const response = await anthropic.messages.create({
        messages: [{ role: 'user', content }],
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
      });

      const textContent = response.content.find(block => 
        block.type === 'text'
      );

      if (!textContent || textContent.type !== 'text') {
        throw new ApiError(500, 'Invalid response format from Claude');
      }

      res.json({
        content: textContent.text,
        type,
        userId
      });
    }
  } catch (error) {
    next(error);
  }
});

export { router as generateRouter };