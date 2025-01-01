// File path: apps/api/src/types/index.ts
import { z } from 'zod';
import type { DocumentType, GenerationType } from '@fedjobs/types';

export const GenerateRequestSchema = z.object({
  type: z.custom<GenerationType>(),
  content: z.string(),
  userId: z.string(),
  prompt: z.string().optional(),
  streaming: z.boolean().optional().default(false)
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface GenerateResponse {
  content: string;
  type: DocumentType;
  userId: string;
}

