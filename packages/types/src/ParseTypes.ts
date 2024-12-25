import { z } from 'zod';

export const ParseRequestSchema = z.object({
  text: z.string(),
  documentId: z.number(),
  userId: z.string(),
  // Make `streaming` optional; default to `false` if not provided
  streaming: z.boolean().optional()
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