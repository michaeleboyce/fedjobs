import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../index';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Mock the dependencies
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (options) => {
          if (options.stream) {
            return {
              [Symbol.asyncIterator]: async function* () {
                yield { choices: [{ delta: { content: 'Test ' } }] };
                yield { choices: [{ delta: { content: 'content' } }] };
              }
            };
          }
          return {
            choices: [{ message: { content: 'Test content' } }]
          };
        })
      }
    }
  }))
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test content' }]
      }),
      stream: vi.fn().mockReturnValue({
        on: vi.fn((event, callback) => {
          if (event === 'text') {
            setTimeout(() => callback('Test '), 10);
            setTimeout(() => callback('content'), 20);
          }
          if (event === 'end') {
            setTimeout(() => callback(), 30);
          }
          return { removeAllListeners: vi.fn() };
        })
      })
    }
  }))
}));

describe('AIService', () => {
  let aiService: AIService;
  
  beforeEach(() => {
    aiService = new AIService();
    vi.clearAllMocks();
  });

  describe('createStreamingResponse', () => {
    it('should handle OpenAI streaming properly', async () => {
      const options = {
        model: 'gpt-4o',
        prompt: 'Test prompt',
        temperature: 0.5,
        maxTokens: 1000
      };

      const { stream, getFullCompletion } = await aiService.createStreamingResponse(options);
      expect(stream).toBeInstanceOf(ReadableStream);
      
      // Consume the stream to test it
      const reader = stream.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }
      
      expect(chunks.join('')).toBe('Test content');
      expect(getFullCompletion()).toBe('Test content');
    });

    it('should handle Anthropic streaming properly', async () => {
      const options = {
        model: 'claude-3-7-sonnet-20250219',
        prompt: 'Test prompt',
        temperature: 0.5,
        maxTokens: 1000
      };

      const { stream, getFullCompletion } = await aiService.createStreamingResponse(options);
      expect(stream).toBeInstanceOf(ReadableStream);

      // Consume the stream to test it
      const reader = stream.getReader();
      const chunks = [];
      
      // Need to wait for async events to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(new TextDecoder().decode(value));
      }
      
      expect(chunks.join('')).toBe('Test content');
      expect(getFullCompletion()).toBe('Test content');
    });
  });

  describe('generateText', () => {
    it('should generate text from OpenAI models', async () => {
      const result = await aiService.generateText({
        model: 'gpt-4o',
        prompt: 'Test prompt'
      });
      
      expect(result).toBe('Test content');
      expect(OpenAI).toHaveBeenCalled();
    });

    it('should generate text from Anthropic models', async () => {
      const result = await aiService.generateText({
        model: 'claude-3-7-sonnet-20250219',
        prompt: 'Test prompt'
      });
      
      expect(result).toBe('Test content');
      expect(Anthropic).toHaveBeenCalled();
    });
  });
});