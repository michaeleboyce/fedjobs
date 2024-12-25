// apps/api/src/services/parsingService.ts

import OpenAI from "openai"; // Updated import style for the OpenAI SDK
import { db, eq } from "@fedjobs/database";
import { parsings as parsingsTable, type NewParsing } from "@fedjobs/database/src/schema/parsings";
import { parseResumeText } from "@fedjobs/utils";
import type { ParseRequest } from "@fedjobs/types";
import { DOMParser } from "xmldom"; // For XML validation
import dotenv from 'dotenv';

dotenv.config();

export class ParsingService {
  private openai: OpenAI;
  private readonly MAX_RETRIES = 3; // Max continuation attempts

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined in environment variables.");
    }
    this.openai = new OpenAI({
      apiKey, // Ensure this environment variable is set
    });
  }

  private createPromptXML(text: string): string {
    return `Please annotate the provided resume text by adding specific XML-style tags, ensuring that the original text is preserved exactly as it is, without any modifications, deletions, or summarizations. Each section describing a position should be enclosed within <position> and </position> tags. Within these, use <date startDate="mm/dd/yyyy" endDate="mm/dd/yyyy" present=boolean> tags for the dates of the position, <title title="Capitalized position title"> for the job title, <organization organization="Capitalized organization name"> for the organization name, and <details> for the full details of the position, including activities and accomplishments. Every distinct accomplishment within the <details> section should be individually wrapped in <accomplishment> tags. Each description of duties and assignments should be wrapped in a <activity> tag. If any text does not clearly fit into these categories, leave it untagged but ensure it remains unchanged. For example:

<html>
  <position>
    <organization organization="Acme Inc.">ACME INC. for Leaders and Champions</organization>
    <title title="Fellow">Annual Fellow Selected through a Competitive Application</title>
    <date startDate="10/01/1991" endDate="11/1/1995" present=false>October, 1991 - November 1995</date>
    <details>
      <activity>Job description and responsibilities.</activity>
      <accomplishment>Specific accomplishment 1.</accomplishment>
      <accomplishment>Specific accomplishment 2.</accomplishment>
      Miscellaneous other text
    </details>
  </position>
</html>

Please follow this structure for the entire resume, maintaining the integrity of the original text. Provide only the XML output without additional comments and complete the ENTIRE document. The text to parse is: ${text}`;
  }

  /**
   * Initiates parsing with logging and streaming.
   * Creates a DB record and streams partial results.
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

  private async createParsingRecord(request: ParseRequest): Promise<NewParsing> {
    const [parsing] = await db
      .insert(parsingsTable)
      .values({
        userId: request.userId,
        type: "resume",
        prompt: this.createPromptXML(request.text),
        completion: "",
        documentId: request.documentId,
        analysisPercent: 0,
        isComplete: false,
        temperature: '0', // Adjust based on your requirements
      })
      .returning();

    return parsing;
  }

  private async processStream(text: string, parsingId: number): Promise<void> {
    let combinedOutput = "";
    let retries = 0;
    let finishReason: string | null = null;

    while (retries < this.MAX_RETRIES) {
      try {
        const stream = await this.openai.chat.completions.create({
          model: "gpt-4", // Corrected model name
          messages: [
            { role: "user", content: this.createPromptXML(text) },
          ],
          stream: true,
        });

        // Stream handling using for-await-of
        for await (const chunk of stream) {
          const message = chunk.choices[0]?.delta?.content;
          const currentFinishReason = chunk.choices[0]?.finish_reason;

          if (message) {
            combinedOutput += message;

            // Update progress based on the length of the combined output
            const progress = Math.round(
              (combinedOutput.length / (text.length || 1)) * 85
            );
            await this.updateProgress(parsingId, progress);
          }

          if (currentFinishReason) {
            finishReason = currentFinishReason;
            break; // Exit the loop if finish_reason is present
          }
        }

        // After streaming, check if finish_reason is "length"
        if (finishReason === "length") {
          retries += 1;
          console.warn(`Response truncated due to token limit. Retrying (${retries}/${this.MAX_RETRIES})...`);
          continue; // Retry the request
        }

        // Check if the XML is complete
        if (this.isXMLComplete(combinedOutput)) {
          await this.completeProcessing(parsingId, combinedOutput);
          return;
        } else {
          retries += 1;
          console.warn(`XML incomplete. Attempting continuation (${retries}/${this.MAX_RETRIES})...`);
          // Optionally, implement a more sophisticated continuation logic here
        }
      } catch (error) {
        retries += 1;
        console.error(`Error during streaming: ${error}. Retrying (${retries}/${this.MAX_RETRIES})...`);
      }
    }

    // If maximum retries reached and XML is still incomplete
    console.error("Maximum continuation attempts reached. XML may be incomplete.");
    await this.completeProcessing(parsingId, combinedOutput);
  }

  /**
   * Synchronously parses the document without logging.
   */
  async parseSyncOrNoLog(request: ParseRequest): Promise<string> {
    let combinedOutput = "";
    let finishReason: string | null = null;
    let retries = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4", // Corrected model name
          messages: [
            { role: "user", content: this.createPromptXML(request.text) },
          ],
          stream: false, // Synchronous call
        });

        combinedOutput = response.choices[0].message?.content || "";
        finishReason = response.choices[0].finish_reason || null;

        if (finishReason === "length") {
          retries += 1;
          console.warn(`Response truncated due to token limit. Retrying (${retries}/${this.MAX_RETRIES})...`);
          continue; // Retry the request
        }

        // Check if the XML is complete
        if (this.isXMLComplete(combinedOutput)) {
          return combinedOutput;
        } else {
          retries += 1;
          console.warn(`XML incomplete. Attempting continuation (${retries}/${this.MAX_RETRIES})...`);
          // Optionally, implement a more sophisticated continuation logic here
        }
      } catch (error) {
        retries += 1;
        console.error(`Error during synchronous parsing: ${error}. Retrying (${retries}/${this.MAX_RETRIES})...`);
      }
    }

    // If maximum retries reached and XML is still incomplete
    console.error("Maximum continuation attempts reached. XML may be incomplete.");
    return combinedOutput; // Return whatever was generated
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
      console.warn("Parsed JSON is invalid or empty.");
      // Optionally, update the parsing task with an error status
      await db
        .update(parsingsTable)
        .set({
          completion: 'Error',
          isComplete: true,
        })
        .where(eq(parsingsTable.id, parsingId));
      return;
    }

    await db
      .update(parsingsTable)
      .set({
        completion: output,
        analysisPercent: 100,
        isComplete: true,
      })
      .where(eq(parsingsTable.id, parsingId));
  }

  /**
   * Checks if the generated XML is complete by attempting to parse it.
   * @param xml The generated XML string.
   * @returns True if XML is well-formed, else False.
   */
  private isXMLComplete(xml: string): boolean {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const parseError = doc.getElementsByTagName("parsererror");
      return parseError.length === 0;
    } catch (error) {
      console.error("XML parsing error:", error);
      return false;
    }
  }
}

export const parsingService = new ParsingService();