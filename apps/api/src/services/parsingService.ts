// File path: apps/api/src/services/parsingService.ts
// apps/api/src/services/parsingService.ts

import OpenAI from "openai";
import { db, eq } from "@fedjobs/database";
import { parsings as parsingsTable, documents as documentsTable} from "@fedjobs/database";
import { parseResumeText, vectorizePositions } from "@fedjobs/utils";
import { ParseRequest, Resume } from "@fedjobs/types";
import { DOMParser } from "xmldom";
import { insertPosition } from "@fedjobs/database/src/queries/positionQueries"; // Import position insertion
import { Position } from "@fedjobs/types"; // Ensure Position includes positionUuid
import dotenv from 'dotenv';

dotenv.config();

export class ParsingService {
  private openai: OpenAI;
  private readonly MAX_RETRIES = 3; // Max continuation attempts

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY_35;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY_35 is not defined in environment variables.");
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
   * Parses the provided text with logging and streaming.
   * This method creates a parsing record and starts the parsing process.
   * 
   * @param request - The parsing request containing text, userId, documentId, and streaming flag.
   * @returns The ID of the created parsing record or null if failed.
   */
  async parseWithLoggingAndStreaming(request: ParseRequest): Promise<number | null> {
    try {
      const parsingId = await this.createParsingRecord(request);

      if (!parsingId) {
        throw new Error("Failed to create a parsing record.");
      }

      // Begin the streaming process in the background.  
      // "fire and forget" (catch errors here or let them bubble up).
      this.processStream(request.text, parsingId, request.addToKnowledgeBank, request.filename).catch(console.error);

      return parsingId;
    } catch (error: any) {
      console.error("Error initiating parsing:", error);
      return null;
    }
  }

  /**
   * Creates a row in the 'parsings' table to track the entire operation.
   * 
   * @param request - The parsing request.
   * @returns The ID of the created parsing record or null if failed.
   */
  private async createParsingRecord(request: ParseRequest): Promise<number | null> {
    try {
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
          temperature: "0", // Temperature might be irrelevant or could be configured
        })
        .returning();

      return parsing?.id || null;
    } catch (error: any) {
      console.error("Error creating parsing record:", error);
      return null;
    }
  }

  /**
   * Streams annotated XML, updates parse progress in DB, 
   * attempts re-stream if truncated, and ultimately calls
   * 'completeProcessing' with final output.
   */
  private async processStream(text: string, parsingId: number, addToKnowledgeBank: boolean, filename: string): Promise<void> {
    let combinedOutput = "";
    let retries = 0;
    let finishReason: string | null = null;
    let lastReportedProgress = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        // Request streaming from GPT-4 (model name can vary).
        const stream = await this.openai.chat.completions.create({
          model: "gpt-4o", 
          messages: [{ role: "user", content: this.createPromptXML(text) }],
          prediction: {
            type: 'content',
            content: text
          },
          stream: true,
        });

        // Read each chunk from the streaming response.
        for await (const chunk of stream) {
          const message = chunk.choices[0]?.delta?.content;
          const currentFinishReason = chunk.choices[0]?.finish_reason;

          if (message) {
            combinedOutput += message;
            // Estimate progress — in this example, up to 85% for raw annotation.
            const progress = Math.round(
              (combinedOutput.length / (text.length || 1)) * 85
            );
            if (progress - lastReportedProgress >= 10) {
              await this.updateProgress(parsingId, progress);
              lastReportedProgress = progress;
            }
          }

          // If the chunk includes a `finish_reason`, we stop reading further.
          if (currentFinishReason) {
            finishReason = currentFinishReason;
            break;
          }
        }

        // If truncated, we can attempt a retry to capture rest of text.
        if (finishReason === "length") {
          retries++;
          console.warn(
            `Output truncated. Retry #${retries} of ${this.MAX_RETRIES}...`
          );
          continue;
        }

        // Check if the combined XML is well-formed.
        if (this.isXMLComplete(combinedOutput)) {
          // Final step: parse the XML -> JSON, update DB.
          await this.completeProcessing(parsingId, combinedOutput, addToKnowledgeBank, filename);
          return;
        } else {
          // If incomplete XML, attempt a continuation
          retries++;
          console.warn(
            `Incomplete XML. Retrying #${retries} of ${this.MAX_RETRIES}...`
          );
        }
      } catch (err) {
        retries++;
        console.error(
          `Error during streaming parse attempt #${retries}: ${err}`
        );
      }
    }

    // If out of retries, finalize anyway with whatever we have.
    console.error("Maximum retries reached. Possibly incomplete XML.");
    await this.completeProcessing(parsingId, combinedOutput, addToKnowledgeBank, filename);
  }

  /**
   * Once we have the (possibly partial) XML output, 
   * - we parse it into JSON, 
   * - store that JSON + mark isParsed in the documents table,
   * - finalize the parsings table record.
   */
 // File path: apps/api/src/services/parsingService.ts

private async completeProcessing(parsingId: number, annotatedXML: string, addToKnowledgeBank: boolean, filename: string): Promise<void> {
  // 1) Convert XML -> JSON (which will follow your Resume schema).
  const parsedResume = parseResumeText(annotatedXML, filename);

  // 2) If parse returns null/undefined, log an error and update accordingly.
  if (!parsedResume) {
    console.warn("XML->JSON parsing returned invalid data; marking as error.");
    await db
      .update(parsingsTable)
      .set({ completion: "Error", isComplete: true })
      .where(eq(parsingsTable.id, parsingId))
      .execute();
    return;
  }

  // 3) Mark the parsing record as complete, store the annotated XML in `completion`.
  await db
    .update(parsingsTable)
    .set({
      completion: annotatedXML,
      analysisPercent: 100,
      isComplete: true,
    })
    .where(eq(parsingsTable.id, parsingId))
    .execute();

  // 4) Retrieve the documentId from the parsings record so we can update 
  //    the related document row.
  const [parsingRecord] = await db
    .select()
    .from(parsingsTable)
    .where(eq(parsingsTable.id, parsingId))
    .execute();

  if (!parsingRecord?.documentId) {
    console.error("No associated documentId for this parsing. Cannot update Document row.");
    return;
  }

  // 5) Insert each position into the 'positions' table with isApproved = false
  try {
    for (const position of parsedResume.positions) {
      await insertPosition({
        positionUuid: position.positionUuid, // Unique UUID
        userId: parsingRecord.userId,
        documentId: parsingRecord.documentId,
        organization: position.organization.name,
        title: position.title.title,
        startDate: position.date.startDate,
        endDate: position.date.endDate,
        present: position.date.present,
        activities: position.details.activities,
        accomplishments: position.details.accomplishments,
        isApproved: false, // New field
      });
    }
  } catch (error) {
    console.error("Error inserting positions into the database:", error);
    // Optionally, mark parsing as error or handle accordingly
    await db
      .update(parsingsTable)
      .set({ completion: "Error inserting positions", isComplete: true })
      .where(eq(parsingsTable.id, parsingId))
      .execute();
    return;
  }

  // 6) Update the Document row with parsed JSON + `isParsed = true`.
  await db
    .update(documentsTable)
    .set({
      data: parsedResume,   // storing the final JSON object
      isParsed: true,
      inKnowledgeBank: addToKnowledgeBank, // Update based on the flag
    })
    .where(eq(documentsTable.id, parsingRecord.documentId))
    .execute();

  // 7) Vectorize the positions if required
  if (addToKnowledgeBank) {
    try {
      // Retrieve updated document with fresh data
      const [updatedDoc] = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.id, parsingRecord.documentId))
        .execute();

      // The JSON should be in updatedDoc.data; cast to your local Resume type
      const resumeData = updatedDoc.data as Resume; // Ensure proper typing

      // Now call your vectorization
      await vectorizePositions(resumeData, String(updatedDoc.id) ,updatedDoc.userId);
    } catch (e) {
      console.error("Error vectorizing positions:", e);
      // Optionally, set a flag or record an error in the DB
    }
  }
}


  /**
   * Checks if the generated XML is well-formed 
   * (i.e., no <parsererror> from xmldom).
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

  /**
   * A simple helper to update partial progress in the parsings table 
   * without spamming DB on every token.
   */
  private async updateProgress(parsingId: number, progress: number) {
    await db
      .update(parsingsTable)
      .set({ analysisPercent: Math.min(progress, 99) })
      .where(eq(parsingsTable.id, parsingId))
      .execute();
  }

  /**
   * Parses a resume text synchronously without logging or streaming.
   * Useful for smaller resumes or debugging scenarios.
   * 
   * @param request - The parsing request.
   * @returns The annotated XML string.
   */
  async parseSyncOrNoLog(request: ParseRequest): Promise<string> {
    let combinedOutput = "";
    let finishReason: string | null = null;
    let retries = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: this.createPromptXML(request.text) }],
          prediction: {
            type: 'content',
            content: request.text
          },
          stream: false,
        });

        combinedOutput = response.choices[0].message?.content || "";
        finishReason = response.choices[0].finish_reason || null;

        if (finishReason === "length") {
          retries++;
          console.warn(`Truncated sync parse. Retrying ${retries}/${this.MAX_RETRIES}`);
          continue;
        }

        if (this.isXMLComplete(combinedOutput)) {
          await this.completeProcessing(request.documentId, combinedOutput, request.addToKnowledgeBank, request.filename);
          return combinedOutput;
        } else {
          retries++;
          console.warn(`Incomplete XML, retrying ${retries}/${this.MAX_RETRIES}`);
        }
      } catch (err) {
        retries++;
        console.error(`Sync parse error, attempt #${retries}:`, err);
      }
    }

    return combinedOutput; // Possibly incomplete, but we've exhausted retries.
  }
}

// Export a singleton instance:
export const parsingService = new ParsingService();
