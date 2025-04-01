// File path: packages/utils/src/Services/AIService/types.ts
// File: packages/utils/src/Services/AIService/types.ts

/**
 * AI providers supported by the service
 */
export type AIProvider = 'openai' | 'anthropic';

/**
 * AI model information
 */
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  supportsStructuredOutput?: boolean;
}

/**
 * Options for streaming AI generation
 */
export interface AIStreamOptions {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
}

/**
 * Parameters for non-streaming text generation
 */
export interface GenerationParams {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Stream response from AI service
 */
export interface StreamResponse {
  stream: ReadableStream<Uint8Array>;
  getFullCompletion: () => string;
}

// Anthropic content types
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

/**
 * Tool definition for Anthropic structured outputs
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Structured output options for OpenAI
 */
export interface StructuredOutputOptions {
  schema: object;
}

/**
 * Structured output result
 */
export interface StructuredOutputResult<T = any> {
  data: T;
  rawResponse: string;
}