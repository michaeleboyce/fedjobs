// api/src/queues/ParseQueue.ts
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Anthropic, HUMAN_PROMPT, AI_PROMPT } from '@anthropic-ai/sdk';
import { db } from '@fedjobs/database';
import { parsings as parsingsTable } from '@fedjobs/database/schema';
import { eq } from 'drizzle-orm';
import { createPrompt, updateParsingProgress, completeProcessing } from '@fedjobs/utils';

interface ParseJobData {
  parsingId: number;
  text: string;
  userId: string;
  documentId: string;
}

const connection = new Redis(process.env.REDIS_URL!);
export const parseQueue = new Queue<ParseJobData>('parse', { connection });

const worker = new Worker<ParseJobData>('parse', async (job) => {
  const { parsingId, text } = job.data;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!
  });

  const prompt = `${HUMAN_PROMPT}${createPrompt(text)}${AI_PROMPT}`;

  const stream = await anthropic.completions.create({
    prompt,
    model: 'claude-2', // use a valid model name
    max_tokens_to_sample: 4096,
    stream: true
  });

  let combinedOutput = '';
  const expectedLength = text.length;

  for await (const chunk of stream) {
    if (chunk && chunk.completion) {
      combinedOutput += chunk.completion;
      const progress = Math.round((combinedOutput.length / expectedLength) * 85);
      await job.updateProgress(progress);
      await updateParsingProgress(parsingId, progress);
    }
  }

  await completeProcessing(parsingId, combinedOutput);
}, { connection });

worker.on('failed', async (job, err) => {
  if (job) {
    await db.update(parsingsTable)
      .set({ status: 'failed', error: err.message })
      .where(eq(parsingsTable.id, job.data.parsingId));
  }
});