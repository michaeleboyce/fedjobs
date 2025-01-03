// File path: apps/web/app/_classes/_generationClasses/EssayGenerator.ts
import { Document, Packer, Paragraph, TextRun } from "docx";
import { db } from "@fedjobs/database";
import { documents as documentsTable } from "@fedjobs/database";
import { OpenAI } from "openai";
import { GenerationSelection } from "@/app/_types/GenerationSelection";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { formatDateMMDDYYYY } from "@/app/_utils/DateUtils";
import { DocumentType } from "@fedjobs/types";
import { uploadFile, generateKeyFromFileName} from "@fedjobs/utils";

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
      `Open Period: ${formatDateMMDDYYYY(details.PositionStartDate)} - ${formatDateMMDDYYYY(
        details.PositionEndDate
      )}`,
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

  static async SaveDocument(
    userId: string,
    generatedText: string,
    description: string
  ): Promise<SaveDocumentResult> {
    try {
      const buffer = await EssayGenerator.createWordDocumentBuffer(generatedText);
      const originalName = `GeneratedDocument.docx`;
      const s3Key = generateKeyFromFileName(originalName);
      
      // Upload the buffer directly to S3
      const uploadResponse = await uploadFile(
        s3Key,
        originalName,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        userId,
        buffer.length
      );

      if (uploadResponse.status === 'failure') {
        return {
          status: "error",
          body: { message: uploadResponse.message }
        };
      }

      const { id, name } = await EssayGenerator.saveToDatabase(
        userId,
        uploadResponse.url,
        generatedText,
        originalName,
        s3Key,
        description
      );

      return {
        status: "ok",
        body: { 
          url: uploadResponse.url, 
          documentId: id, 
          documentName: name, 
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

  private async generateDocument(): Promise<string> {
    const prompt = this.createPrompt();

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_35 || "" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful writer whose job is to create draft documents for job applications, including cover letters, technical core qualification, or executive core qualification essays..."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      });

      const documentText = response.choices?.[0]?.message?.content?.trim() ?? "No response generated.";
      return documentText;
    } catch (error) {
      console.error("Error in document generation:", error);
      throw error;
    }
  }

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

  private static async saveToDatabase(
    userId: string,
    url: string,
    content: string,
    filename: string,
    s3Key: string,
    description: string
  ): Promise<{ id: number; name: string }> {
    const result = await db
      .insert(documentsTable)
      .values({
        userId: userId,
        type: "ecq",
        source: "APPLICATION_GENERATED",
        url: url,
        s3Key: s3Key,
        content: content,
        name: filename,
        description: description,
        isParsed: true,
        data: {}
      })
      .returning();

    if (!result || result.length !== 1) {
      throw new Error("Error saving object to database");
    }

    return { id: result[0].id, name: result[0].name };
  }

  protected formatLengthRequirementNOMORETHAN_X_WORDSorPAGES(): string {
    const { length, lengthUnit } = this._generationSelection;
    if (lengthUnit === 'words') {
      return `NO MORE THAN ${length} WORDS`;
    } else if (lengthUnit === 'pages') {
      return `NO MORE THAN ${length} PAGES`;
    }
    return '';
  }
  
}

