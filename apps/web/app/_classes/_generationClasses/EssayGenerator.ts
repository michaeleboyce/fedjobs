// File path: apps/web/app/_classes/_generationClasses/EssayGenerator.ts
// apps/web/app/_classes/_generationClasses/EssayGenerator.ts
// Refactored to use DocumentRepository for saving generated documents.
import { Document, Packer, Paragraph, TextRun } from "docx";
import { DocumentType } from "@fedjobs/types";
import { GenerationSelection } from "@/app/_types/GenerationSelection";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { formatDateMMDDYYYY } from "@/app/_utils/DateUtils";
import { uploadFile, generateKeyFromFileName } from "@fedjobs/utils";
// Import DocumentRepository from our repository layer.
import { DocumentRepository } from "@fedjobs/database";
import { OpenAI } from 'openai';

export type SaveDocumentResult =
  | {
      status: "ok";
      body: {
        url: string;
        documentId: number;
        documentName: string;
        generatedText: string;
      };
    }
  | {
      status: "error";
      body: { message: string };
    };

export abstract class EssayGenerator {
  abstract createPrompt(): string;
  abstract createParagraphPrompt(
    paragraphId: number,
    regenerationText: string,
    streamingTextArray: StreamingTextArray
  ): string;
  abstract getDescription(): string;
  abstract getFileNamePrefix(): string;

  protected _documentType: DocumentType;
  protected _generationSelection: GenerationSelection;

  constructor(documentType: DocumentType, generationSelection: GenerationSelection) {
    this._documentType = documentType;
    this._generationSelection = generationSelection;
  }

  public get documentType(): DocumentType {
    return this._documentType;
  }

  protected get jobDescription(): string {
    let description = this._generationSelection.jobInfo.jobDescription;
    const job = this._generationSelection.jobInfo.job;
    if (!job) return description;

    const details = job.MatchedObjectDescriptor;
    const USAJobsDescription = [
      `${details.PositionTitle}, ${details.DepartmentName}`,
      `Location: ${details.PositionLocationDisplay}`,
      `Organization: ${details.OrganizationName}`,
      `SubAgency: ${details.SubAgency}`,
      `Grade: ${details.JobGrade?.[0]?.Code ?? ""}`,
      `Schedule: ${details.PositionSchedule?.[0]?.Name ?? ""}`,
      `Open Period: ${formatDateMMDDYYYY(details.PositionStartDate)} - ${formatDateMMDDYYYY(details.PositionEndDate)}`,
      `Qualifications: ${details.QualificationSummary}`,
      `Agency Marketing Statement: ${details.UserArea.Details.AgencyMarketingStatement}`,
      `Major Duties: ${details.UserArea.Details.MajorDuties.join(" ")}`,
      `Evaluations: ${details.UserArea.Details.Evaluations}`
    ].join("\n");

    return `
<userEnteredDescription>
  ${description}
</userEnteredDescription>
<descriptionFromUSAJobs>
  ${USAJobsDescription}
</descriptionFromUSAJobs>`;
  }

  async GenerateDocument(userId: string) {
    const generatedText = await this.generateDocument();
    return generatedText;
  }

  /**
   * Saves the generated document by creating a Word document,
   * uploading it to S3, and saving the record via the DocumentRepository.
   */
  static async SaveDocument(
    userId: string,
    generatedText: string,
    description: string
  ): Promise<SaveDocumentResult> {
    try {
      // Create the Word document buffer.
      const buffer = await EssayGenerator.createWordDocumentBuffer(generatedText);
      const originalName = `GeneratedDocument.docx`;
      const s3Key = generateKeyFromFileName(originalName);

      // Upload the document buffer to S3.
      const uploadResponse = await uploadFile(
        s3Key,
        originalName,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        userId,
        buffer.length
      );

      if (uploadResponse.status === "failure") {
        return { status: "error", body: { message: uploadResponse.message } };
      }

      // Use DocumentRepository to save the document record.
      const documentRepo = new DocumentRepository();
      const result = await documentRepo.insert({
        userId: userId,
        type: "ecq", // Ensure this is a valid DocumentType value.
        source: "APPLICATION_GENERATED",
        url: uploadResponse.url,
        s3Key: s3Key,
        content: generatedText,
        name: originalName,
        description: description,
        isParsed: true,
        data: {}
      });

      if (!result) {
        throw new Error("Error saving object to database");
      }

      return {
        status: "ok",
        body: {
          url: uploadResponse.url,
          documentId: result.id,
          documentName: result.name,
          generatedText
        }
      };
    } catch (error) {
      console.error("Error in SaveDocument:", error);
      return {
        status: "error",
        body: { message: error instanceof Error ? error.message : "Unknown error occurred" }
      };
    }
  }

  // Private helper to generate document text from OpenAI.
  private async generateDocument(): Promise<string> {
    const prompt = this.createPrompt();
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_35 || "" });
      const response = await openai.chat.completions.create({
        model: "o1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful writer whose job is to create draft documents for job applications, including cover letters, technical core qualification, or executive core qualification essays..."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        store: true,
        metadata: {
          type: "generation",
          subType: this._documentType
        }
      });
      const documentText = response.choices?.[0]?.message?.content?.trim() ?? "No response generated.";
      return documentText;
    } catch (error) {
      console.error("Error in document generation:", error);
      throw error;
    }
  }

  // Creates a Word document buffer from generated text using docx.
  private static async createWordDocumentBuffer(generatedText: string): Promise<Buffer> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: generatedText.split("\n").map(
            (paragraphText) =>
              new Paragraph({
                children: [new TextRun(paragraphText)]
              })
          )
        }
      ]
    });
    return await Packer.toBuffer(doc);
  }

  // This method formats length requirements based on the generation selection.
  protected formatLengthRequirementNOMORETHAN_X_WORDSorPAGES(): string {
    const { length, lengthUnit } = this._generationSelection;
    if (lengthUnit === "words") {
      return `NO MORE THAN ${length} WORDS`;
    } else if (lengthUnit === "pages") {
      return `NO MORE THAN ${length} PAGES`;
    }
    return "";
  }
}
