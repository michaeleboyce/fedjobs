// File path: apps/web/app/features/generation/utils/documentTransformers.ts
import { StreamingTextArray } from '@fedjobs/types';

/**
 * Convert a plain text document into paragraphs
 */
export function textToParagraphs(text: string): StreamingTextArray {
  return text
    .split(/\n\s*\n+/)
    .map((paragraph, idx) => ({
      id: idx,
      text: paragraph.trim()
    }));
}

/**
 * Convert paragraphs back to plain text
 */
export function paragraphsToText(paragraphs: StreamingTextArray): string {
  return paragraphs.map(p => p.text).join('\n\n');
}