// File path: packages/types/src/ParseTypes.ts
import { z } from 'zod';

export const DocumentParseRequestSchema = z.object({
  addToKnowledgeBank: z.coerce.boolean().optional().default(false),
  streaming: z.coerce.boolean().optional().default(true),
});

export type DocumentParseRequest = z.infer<typeof DocumentParseRequestSchema>;

export const ParseRequestSchema = z.object({
  text: z.string(),
  documentId: z.number(),
  userId: z.string(),
    // Make `addToKnowledgeBank` optional; default to `false` if not provided
  filename: z.string(),
  addToKnowledgeBank: z.coerce.boolean().optional().default(false),
    // Make `streaming` optional; default to `true` if not provided
  streaming: z.coerce.boolean().optional().default(true)
});

export type ParseRequest = z.infer<typeof ParseRequestSchema>;

export type ParseStatus = {
  status: 'complete' | 'pending' | 'error';
  percent: number;
  error?: string;
};

export type ParseResponse = {
  parsingId: number;
};