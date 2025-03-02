// File path: apps/web/app/services/documentUploadService.ts
// app/services/documentService.ts
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { DocumentType } from '@fedjobs/types';
import { uploadFile, generateKeyFromFileName } from '@fedjobs/utils';
import { DocumentRepository } from '@fedjobs/database';

// For type safety
export interface SaveDocumentParams {
  userId: string;
  content: string;
  documentType: DocumentType;
  title: string;
  description: string;
}

export interface SaveDocumentResult {
  status: 'ok' | 'error';
  body: {
    url?: string;
    documentId?: number;
    documentName?: string;
    message?: string;
  };
}

export class DocumentUploadService {
  private static documentRepo = new DocumentRepository();

  /**
   * Creates a Word document buffer from text content
   */
  private static async createWordDocumentBuffer(content: string): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: content.split('\n').map(paragraphText => 
          new Paragraph({ children: [new TextRun(paragraphText)] })
        ),
      }],
    });
    return await Packer.toBuffer(doc);
  }

  /**
   * Saves a document with provided content
   */
  public static async saveDocument({
    userId,
    content,
    documentType,
    title,
    description
  }: SaveDocumentParams): Promise<SaveDocumentResult> {
    try {
      // 1. Create document buffer
      const buffer = await this.createWordDocumentBuffer(content);
      
      // 2. Generate a unique filename
      const filename = `${this.getFileNamePrefix(documentType)}${Date.now()}.docx`;
      const s3Key = generateKeyFromFileName(filename);
      
      // 3. Upload to S3 using utility function
      const uploadResponse = await uploadFile(
        s3Key,
        filename,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        userId,
        buffer.length // Keep fileSize but remove buffer
      );
      
      if (uploadResponse.status === 'failure') {
        return {
          status: 'error',
          body: { message: uploadResponse.message }
        };
      }
      
      // 4. Save to database using repository
      const document = await this.documentRepo.insert({
        userId,
        type: documentType,
        source: "APPLICATION_GENERATED",
        url: uploadResponse.url,
        s3Key,
        content,
        name: filename,
        description,
        isParsed: true,
        data: {}
      });
      
      // 5. Return success with document details
      return {
        status: 'ok',
        body: {
          url: uploadResponse.url,
          documentId: document.id,
          documentName: document.name
        }
      };
    } catch (error) {
      console.error("Error saving document:", error);
      return {
        status: 'error',
        body: { 
          message: error instanceof Error ? error.message : "Unknown error occurred"
        }
      };
    }
  }
  
  /**
   * Get file name prefix based on document type
   */
  private static getFileNamePrefix(documentType: DocumentType): string {
    const prefixMap: Record<DocumentType, string> = {
      'ecq': 'ECQ-Document-',
      'tcq': 'TCQ-Document-',
      'resume': 'Resume-',
      'cover_letter': 'Cover-Letter-',
      'other': 'Document-',
    };
    
    return prefixMap[documentType] || 'Document-';
  }
}