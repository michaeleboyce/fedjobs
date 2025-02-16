// File path: apps/api/src/services/parsingService.ts
// apps/api/src/services/parsingService.ts
// Refactored to use repository classes instead of raw db queries

import OpenAI from "openai";
import { DOMParser } from "xmldom";
import dotenv from "dotenv";
// Import our repository classes from the database package.
import { ParsingRepository, DocumentRepository, PositionRepository } from "@fedjobs/database"
import { parseResumeText, vectorizePositions, querySimilarPositions } from "@fedjobs/utils";
import { ParseRequest, Resume, Position } from "@fedjobs/types";

dotenv.config();

// Instantiate repository singletons (or create them per method if preferred)
const parsingRepo = new ParsingRepository();
const documentRepo = new DocumentRepository();
const positionRepo = new PositionRepository();

export class ParsingService {
  private openai: OpenAI;
  private readonly MAX_RETRIES = 3; // Maximum number of streaming retries

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY_35;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY_35 is not defined in environment variables.");
    }
    this.openai = new OpenAI({ apiKey });
  }

  // Generates the XML prompt using a fixed template.
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
   * Main entry point for parsing with logging and streaming.
   * Creates a parsing record then fires off streaming in the background.
   */
  async parseWithLoggingAndStreaming(request: ParseRequest): Promise<number | null> {
    try {
      // Create a new parsing record via our repository.
      const record = await parsingRepo.insert({
        userId: request.userId,
        type: "resume", // (Assuming "resume" is a valid DocumentType value.)
        prompt: this.createPromptXML(request.text),
        completion: "",
        documentId: request.documentId,
        analysisPercent: 0,
        isComplete: false,
        temperature: "0",
      });
      if (!record?.id) {
        throw new Error("Failed to create a parsing record.");
      }
      // Fire off streaming process in background.
      this.processStream(request.text, record.id, request.addToKnowledgeBank, request.filename)
        .catch(console.error);
      return record.id;
    } catch (error: any) {
      console.error("Error initiating parsing:", error);
      return null;
    }
  }

  /**
   * Streams annotated XML from OpenAI, updates progress dynamically,
   * and eventually calls completeProcessing when done.
   */
  private async processStream(
    text: string,
    parsingId: number,
    addToKnowledgeBank: boolean,
    filename: string
  ): Promise<void> {
    let combinedOutput = "";
    let retries = 0;
    let finishReason: string | null = null;
    let lastReportedProgress = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        // Request streaming from OpenAI.
        const stream = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: this.createPromptXML(text) }],
          prediction: { type: "content", content: text },
          stream: true,
          store: true,
          metadata: { type: "parsing" }
        });

        // Process each streamed chunk.
        for await (const chunk of stream) {
          const message = chunk.choices[0]?.delta?.content;
          const currentFinishReason = chunk.choices[0]?.finish_reason;
          if (message) {
            combinedOutput += message;
            // Estimate progress (up to 50% of total for raw annotation)
            const progress = (combinedOutput.length / (text.length || 1)) * 50;
            const flooredProgress = this.floorToNearestTen(progress);
            const updatedProgress = this.shouldUpdateProgress(flooredProgress, lastReportedProgress, 50);
            if (updatedProgress !== null) {
              await parsingRepo.updateProgress(parsingId, updatedProgress);
              lastReportedProgress = updatedProgress;
            }
          }
          if (currentFinishReason) {
            finishReason = currentFinishReason;
            break;
          }
        }

        // If truncated, try again.
        if (finishReason === "length") {
          retries++;
          console.warn(`Output truncated. Retry #${retries} of ${this.MAX_RETRIES}...`);
          continue;
        }

        // When XML is complete, finalize processing.
        if (this.isXMLComplete(combinedOutput)) {
          await this.completeProcessing(parsingId, combinedOutput, addToKnowledgeBank, filename);
          return;
        } else {
          retries++;
          console.warn(`Incomplete XML. Retrying #${retries} of ${this.MAX_RETRIES}...`);
        }
      } catch (err) {
        retries++;
        console.error(`Error during streaming parse attempt #${retries}: ${err}`);
      }
    }

    // If maximum retries reached, finalize with current output.
    console.error("Maximum retries reached. Possibly incomplete XML.");
    await this.completeProcessing(parsingId, combinedOutput, addToKnowledgeBank, filename);
  }

  /**
   * Finalizes processing by:
   * 1. Converting XML to JSON using parseResumeText.
   * 2. Marking the parsing record as complete.
   * 3. Updating the associated Document record.
   * 4. Inserting positions via the PositionRepository.
   * 5. Optionally vectorizing positions.
   */
  private async completeProcessing(
    parsingId: number,
    annotatedXML: string,
    addToKnowledgeBank: boolean,
    filename: string
  ): Promise<void> {
    // 1. Convert XML to JSON.
    const parsedResume: Resume | null = parseResumeText(annotatedXML, filename);
    if (!parsedResume) {
      console.warn("XML->JSON parsing returned invalid data; marking as error.");
      await parsingRepo.markAsError(parsingId);
      return;
    }

    // 2. Finalize the parsing record.
    await parsingRepo.finalize(parsingId, annotatedXML);

    // 3. Retrieve the parsing record to obtain the associated documentId.
    const parsingRecord = await parsingRepo.getById(parsingId);
    if (!parsingRecord?.documentId) {
      console.error("No associated documentId for this parsing. Cannot update Document row.");
      return;
    }

    // 4. Insert each position using the PositionRepository.
    try {
      for (const position of parsedResume.positions) {
        await positionRepo.insert({
          positionUuid: position.positionUuid,
          userId: parsingRecord.userId,
          documentId: parsingRecord.documentId,
          organization: position.organization.name,
          title: position.title.title,
          startDate: position.date.startDate,
          endDate: position.date.endDate,
          present: position.date.present,
          activities: position.details.activities,
          accomplishments: position.details.accomplishments,
          isEmploymentHistory: false,
          originalPositionUuid: null,
          originalDocumentId: null,
          similarPositionUuids: [],
          approvedSimilarPositionUuids: [],
          rejectedSimilarPositionUuids: [],
        });
      }
    } catch (error) {
      console.error("Error inserting positions into the database:", error);
      await parsingRepo.markAsError(parsingId);
      return;
    }

    // 5. Update the Document record via DocumentRepository.
    await documentRepo.update(parsingRecord.documentId, {
      data: parsedResume,
      isParsed: true,
      inKnowledgeBank: addToKnowledgeBank,
    });

    // 6. If vectorization is required, retrieve the updated document and vectorize positions.
    if (addToKnowledgeBank) {
      try {
        const updatedDoc = await documentRepo.getById(parsingRecord.documentId);
        if (!updatedDoc) {
          throw new Error("Document not found during vectorization");
        }
        const resumeData = updatedDoc.data as Resume;
        await vectorizePositions(resumeData, updatedDoc.userId, String(updatedDoc.id));

        // Optionally update progress as positions are vectorized.
        const totalPositions = resumeData.positions.length;
        let processedPositions = 0;
        let lastReportedProgress = 50; // starting from 50%
        if (totalPositions === 0) {
          await parsingRepo.updateProgress(parsingId, 100);
        } else {
          for (const p of resumeData.positions) {
            const similarMatches = await querySimilarPositions(
              String(updatedDoc.id),
              p.positionUuid,
              0.9
            );
            await this.updateSimilarPositions(p, similarMatches);
            processedPositions++;
            const similarityProgress = (processedPositions / totalPositions) * 50;
            const overallProgress = similarityProgress + 50;
            const flooredProgress = this.floorToNearestTen(overallProgress);
            const updatedProgress = this.shouldUpdateProgress(flooredProgress, lastReportedProgress, 100);
            if (updatedProgress !== null) {
              await parsingRepo.updateProgress(parsingId, updatedProgress);
              lastReportedProgress = updatedProgress;
            }
          }
          if (lastReportedProgress < 100) {
            await parsingRepo.updateProgress(parsingId, 100);
          }
        }
      } catch (e) {
        console.error("Error vectorizing positions:", e);
      }
    }
  }

  /**
   * Checks if the given XML is well-formed.
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
   * Helper function to update parsing progress.
   */
  private async updateProgress(parsingId: number, progress: number): Promise<void> {
    await parsingRepo.updateProgress(parsingId, Math.min(progress, 99));
  }

  /**
   * Synchronous parsing method for smaller resumes or debugging.
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
          prediction: { type: "content", content: request.text },
          stream: false,
          store: true,
          metadata: { type: "parsing" }
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
    return combinedOutput;
  }

  /**
   * Utility method to extract a positionUuid from a composite ID.
   */
  private extractPositionUuid(fullId: string): string {
    return fullId.split('#')[1];
  }

  /**
   * Updates similar positions in the database for a given position.
   *
   * For each similar match:
   *  - Skip if the similar UUID is already approved, rejected, or equal to the current position.
   *  - Retrieve the matched position using the repository.
   *  - Add the current position's UUID to the matched position’s similarPositionUuids.
   *  - Update the matched position via the repository.
   *
   * Finally, update the current position with all collected similar UUIDs.
   */
  private async updateSimilarPositions(
    currentPosition: Position,
    similarMatches: { id: string; score: number }[]
  ): Promise<void> {
    const similarUuids: string[] = [];
    for (const match of similarMatches) {
      // Extract the similar position's UUID from the composite match ID.
      const similarUuid = this.extractPositionUuid(match.id);

      // Skip if this similarUuid is already processed or is the same as the current position.
      if (
        currentPosition.approvedSimilarPositionUuids.includes(similarUuid) ||
        currentPosition.rejectedSimilarPositionUuids.includes(similarUuid) ||
        currentPosition.positionUuid === similarUuid
      ) {
        continue;
      }
      similarUuids.push(similarUuid);

      // Retrieve the matched position using the repository.
      const matchedPosition = await positionRepo.getByUuid(similarUuid);
      if (matchedPosition) {
        // Create a new set of similarPositionUuids from the matched position.
        const updatedSimilar = new Set(matchedPosition.similarPositionUuids);
        // Add the current position's UUID to the set.
        updatedSimilar.add(currentPosition.positionUuid);
        // Update the matched position with the new similarPositionUuids using the repository.
        await positionRepo.updateFields(matchedPosition.positionUuid, {
          similarPositionUuids: Array.from(updatedSimilar),
        });
      }
    }

    // Combine the existing similarPositionUuids of the current position with the newly found similar UUIDs.
    const updatedSimilar = new Set(currentPosition.similarPositionUuids);
    similarUuids.forEach(uuid => updatedSimilar.add(uuid));

    // Update the current position with the combined similarPositionUuids via the repository.
    await positionRepo.updateFields(currentPosition.positionUuid, {
      similarPositionUuids: Array.from(updatedSimilar),
    });
  }

  /**
   * Floors progress to the nearest 10%.
   */
  private floorToNearestTen(progress: number): number {
    return Math.floor(progress / 10) * 10;
  }

  /**
   * Determines whether to update progress based on current and last reported progress.
   */
  private shouldUpdateProgress(newProgress: number, lastProgress: number, maxProgress: number): number | null {
    const flooredProgress = this.floorToNearestTen(newProgress);
    if (flooredProgress > lastProgress && flooredProgress <= maxProgress) {
      return flooredProgress;
    }
    return null;
  }
}

// Export a singleton instance.
export const parsingService = new ParsingService();
