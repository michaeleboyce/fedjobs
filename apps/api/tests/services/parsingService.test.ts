// File path: apps/api/tests/services/parsingService.test.ts
import { Anthropic } from '@anthropic-ai/sdk';
import { db } from '@fedjobs/database';
import { parsings as parsingsTable, type NewParsingRecord } from '@fedjobs/database/src/schema/parsings';
import { parseResumeText } from '@fedjobs/utils';
import { eq } from '@fedjobs/database';
import type { ParseRequest } from '@fedjobs/types';

export class ParsingService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
  }

  private createPrompt(text: string): string {
    return `Please annotate the provided resume text by adding specific XML-style tags, ensuring that the original text is preserved exactly as it is, without any modifications, deletions, or summarizations. Each section describing a position should be enclosed within <position> and </position> tags. Within these, use <date startDate="mm/dd/yyyy" endDate="mm/dd/yyyy" present=boolean> tags for the dates of the position, <title title="Capitalized position title"> for the job title, <organization organization="Capitalized organization name"> for the organization name, and <details> for the full details of the position, including activities and accomplishments. Every distinct accomplishment within the <details> section should be individually wrapped in <accomplishment> tags. Each description of duties and assignments should be wrapped in a <activity> tag. If any text does not clearly fit into these categories, leave it untagged but ensure it remains unchanged. For example:
  
    <html> <position> <organization organization="Acme Inc.">ACME INC. for Leaders and Champions</organization> <title title="Fellow">Annual Fellow Selected through a Competitive Application</title> <date startDate="10/01/1991" endDate="11/1/1995" current=false>October, 1991 - November 1995</date> <details> <activity>Job description and responsibilities.<activity> <accomplishment>Specific accomplishment 1.</accomplishment> <accomplishment>Specific accomplishment 2.</accomplishment> Miscellaneous other text </details> </position> </html> Please follow this structure for the entire resume, maintaining the integrity of the original text.Provide only the output and complete the ENTIRE document. The text to parse is: ${text}
    `;
  }

  /**
   * -----------------------
   * 1) WITH LOGGING + STREAM
   * -----------------------
   * Creates a DB record, streams partial results, 
   * updates progress in the DB, completes the record with final text.
   */
  async parseWithLoggingAndStreaming(request: ParseRequest): Promise<number> {
    const parsing = await this.createParsingRecord(request);
    
    if (!parsing.id) {
      throw new Error("No parsing ID generated");
    }

    // Start the streaming process in the background
    this.processStream(request.text, parsing.id).catch(console.error);

    // Return the new parsing ID so the caller can track it or 
    // poll for status, etc.
    return parsing.id;
  }

  private async createParsingRecord(request: ParseRequest): Promise<NewParsingRecord> {
    const [parsing] = await db
      .insert(parsingsTable)
      .values({
        userId: request.userId,
        type: "resume",
        prompt: this.createPrompt(request.text),
        completion: '',
        documentId: request.documentId,
        analysisPercent: 0,
        isComplete: false,
        temperature: "0.0"
      })
      .returning();

    return parsing;
  }

  private async processStream(text: string, parsingId: number): Promise<void> {
    const stream = await this.anthropic.messages.create({
      messages: [{ role: 'user', content: this.createPrompt(text) }],
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      stream: true
    });

    let combinedOutput = '';
    const expectedLength = text.length || 1;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
        combinedOutput += chunk.delta.text;

        // Example: update DB progress based on some ratio
        const progress = Math.round(
          (combinedOutput.length / expectedLength) * 85
        );
        await this.updateProgress(parsingId, progress);
      }
    }

    // Once stream is done, finalize
    await this.completeProcessing(parsingId, combinedOutput);
  }

  private async updateProgress(parsingId: number, progress: number): Promise<void> {
    await db
      .update(parsingsTable)
      .set({ analysisPercent: Math.min(99, progress) })
      .where(eq(parsingsTable.id, parsingId));
  }

  private async completeProcessing(parsingId: number, output: string): Promise<void> {
    const json = parseResumeText(output);
    if (!json) {
      return;
    }

    await db
      .update(parsingsTable)
      .set({
        completion: output,
        analysisPercent: 100,
        isComplete: true
      })
      .where(eq(parsingsTable.id, parsingId));
  }

  /**
   * -----------------------
   * 2) SIMPLE CALL (NO STREAM, optional NO LOGGING)
   * -----------------------
   * Immediately returns the parsed text in one response, 
   * no DB record, or you could optionally add DB logging.
   */
  async parseSyncOrNoLog(request: ParseRequest): Promise<string> {
    // If you wanted to create a DB record but NOT track streaming progress,
    // you could do something similar to createParsingRecord here, 
    // then finalize it right away.

    // Example: Just call anthropic synchronously
    const response = await this.anthropic.messages.create({
      messages: [{ role: 'user', content: this.createPrompt(request.text) }],
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096
    });

    // The “text” from the API call
    let combinedOutput = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        combinedOutput += block.text;
      }
    }

    // If you want to parse the JSON from the annotated text, do it here:
    // const parsedJson = parseResumeText(combinedOutput);

    // Return the raw annotated text
    return combinedOutput;
  }
}

export const parsingService = new ParsingService();