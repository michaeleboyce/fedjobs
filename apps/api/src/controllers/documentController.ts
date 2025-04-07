// apps/api/src/controllers/documentController.ts
import { Request, Response } from 'express';
import { DocumentService } from '../services/document/documentService';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { DocumentType } from '@fedjobs/types';

/**
 * Controller for document-related endpoints
 */
export class DocumentController {
  /**
   * Create a new document controller
   */
  constructor(private documentService: DocumentService) {}

  /**
   * Parse a document from request file
   */
  public parseDocument = asyncHandler(async (req: Request, res: Response) => {
    // Ensure we have a file
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }
    
    // Extract options from request
    const documentType = req.body.documentType as DocumentType;
    const description = req.body.description as string;
    const content = req.body.content as string;
    const addToKnowledgeBank = req.body.addToKnowledgeBank === 'true';
    const userId = req.body.userId as string;
    
    if (!userId) {
      throw new BadRequestError('userId is required');
    }
    
    // Process document
    const result = await this.documentService.processDocument(
      req.file,
      userId,
      {
        documentType,
        description,
        content,
        addToKnowledgeBank,
      }
    );
    
    res.json({
      success: {
        text: result.text,
        type: result.type,
        url: result.url,
        document: result.document,
        documentId: result.documentId,
      }
    });
  });

  /**
   * Get documents by user ID
   */
  public getDocumentsByUserId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      throw new BadRequestError('userId is required');
    }
    
    const documents = await this.documentService.getByUserId(userId);
    res.json(documents);
  });

  /**
   * Get a document by ID
   */
  public getDocumentById = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id);
    const userId = req.query.userId as string;
    
    const document = await this.documentService.getById(documentId, userId);
    res.json(document);
  });

  /**
   * Get a signed URL for a document
   */
  public getSignedUrl = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id);
    
    const result = await this.documentService.getSignedUrl(documentId);
    res.json({ success: result });
  });

  /**
   * Update a document
   */
  public updateDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id);
    const updateData = req.body;
    
    const document = await this.documentService.updateDocument(documentId, updateData);
    res.json(document);
  });

  /**
   * Delete a document
   */
  public deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id);
    
    await this.documentService.deleteDocument(documentId);
    res.status(204).send();
  });
}