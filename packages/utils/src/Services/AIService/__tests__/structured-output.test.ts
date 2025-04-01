// File path: packages/utils/src/Services/AIService/__tests__/structured-output.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../index';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Mock OpenAI and Anthropic SDKs
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: '{"name":"John Doe","age":30,"skills":["JavaScript","TypeScript","React"]}'
                }
              }
            ]
          })
        }
      }
    }))
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'tool_use',
              name: 'extract_person_info',
              input: {
                name: 'Jane Smith',
                age: 28,
                skills: ['Python', 'Data Science', 'Machine Learning']
              }
            }
          ]
        })
      }
    }))
  };
});

describe('AIService - Structured Output', () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService();
    // Mock environment variables
    vi.stubEnv('OPENAI_API_KEY_35', 'test-key');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
  });

  it('should generate structured output with OpenAI', async () => {
    // Define schema for a person
    const personSchema = {
      name: { type: 'string' },
      age: { type: 'number' },
      skills: { type: 'array', items: { type: 'string' } }
    };

    // Generate structured output
    const result = await service.generateStructuredOutput({
      model: 'gpt-4o',
      prompt: 'Extract information about John Doe, a 30-year-old developer with skills in JavaScript, TypeScript, and React',
      schema: personSchema
    });

    // Verify the result
    expect(result.data).toEqual({
      name: 'John Doe',
      age: 30,
      skills: ['JavaScript', 'TypeScript', 'React']
    });

    // Verify the raw response
    expect(result.rawResponse).toContain('John Doe');
  });

  it('should generate structured output with Anthropic', async () => {
    // Define schema for a person
    const personSchema = {
      name: { type: 'string' },
      age: { type: 'number' },
      skills: { type: 'array', items: { type: 'string' } }
    };

    // Generate structured output
    const result = await service.generateStructuredOutput({
      model: 'claude-3-7-sonnet-20250219',
      prompt: 'Extract information about Jane Smith, a 28-year-old data scientist with skills in Python, Data Science, and Machine Learning',
      schema: personSchema,
      toolName: 'extract_person_info',
      toolDescription: 'Extract structured information about a person'
    });

    // Verify the result
    expect(result.data).toEqual({
      name: 'Jane Smith',
      age: 28,
      skills: ['Python', 'Data Science', 'Machine Learning']
    });

    // Verify that it contains the raw data as a string
    expect(result.rawResponse).toContain('Jane Smith');
  });

  it('should throw an error for unsupported models', async () => {
    // Define schema for a person
    const personSchema = {
      name: { type: 'string' },
      age: { type: 'number' }
    };

    // Attempt to use an unsupported model
    await expect(
      service.generateStructuredOutput({
        model: 'unsupported-model',
        prompt: 'Extract information about John Doe',
        schema: personSchema
      })
    ).rejects.toThrow(/does not support structured output/);
  });
});