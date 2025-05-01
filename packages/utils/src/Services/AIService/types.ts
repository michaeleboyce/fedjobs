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
  jsonMode?: boolean;
}

/**
 * Parameters for non-streaming text generation
 */
export interface GenerationParams {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
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
// Example usage:
// When handling a response from Anthropic's Claude model, you might receive a ToolUseBlock like this:
// { type: 'tool_use', id: '123', name: 'getWeather', input: { location: 'NYC' } }
// This interface is used to type such blocks in AIService responses. It is specific to Anthropic models and not used for OpenAI.
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export type ContentBlock = TextBlock | ToolUseBlock;