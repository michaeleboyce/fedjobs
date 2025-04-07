// apps/api/src/controllers/parseController.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { ParsingService } from '../services/parsing/parsingService';
import { WebSocketManager } from '../services/realtime/webSocketManager';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { ParseRequestSchema, ParseRequest } from '@fedjobs/types';

/**
 * Controller for parsing-related endpoints
 */
export class ParsingController {
  /**
   * Create a new parsing controller
   */
  constructor(
    private parsingService: ParsingService,
    private wsManager: WebSocketManager
  ) {}

  /**
   * Parse a document
   */
  public parseDocument = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = ParseRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request body', validation.error.format());
    }

    // Extract validated data
    const {
      text,
      userId,
      documentId,
      filename,
      addToKnowledgeBank,
      streaming = false,
    } = validation.data;

    // Initiate parsing based on the streaming flag
    if (streaming) {
      // Logs into DB, tracks progress, returns an ID
      const parseId = await this.parsingService.parseWithLoggingAndStreaming({
        text,
        userId,
        documentId,
        filename,
        streaming,
        addToKnowledgeBank
      });

      // Return parseId so that the client can poll for status
      res.json({ parseId, streaming: true });
      
      // Send WebSocket notification if available
      if (this.wsManager) {
        this.wsManager.sendToUser(userId, {
          type: 'job_found', // Reusing an existing event type
          timestamp: new Date().toISOString(),
          data: {
            parseId,
            status: 'started',
            message: 'Parsing process started'
          }
        });
      }
    } else {
      // Immediately do a synchronous parse with no DB logging
      const annotatedText = await this.parsingService.parseSyncOrNoLog({
        text,
        userId,
        documentId,
        filename,
        streaming,
        addToKnowledgeBank
      });
      
      res.json({ annotatedText, streaming: false });
    }
  });

  /**
   * Get parsing status by document ID
   */
  public getParsingStatus = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(documentId)) {
      throw new BadRequestError('Invalid document ID');
    }

    // Get parsing status
    const parseTask = await this.parsingService.getParsingStatusByDocumentId(documentId);
    if (!parseTask) {
      throw new NotFoundError('No parsing task found for this document');
    }
    
    res.json({
      parseId: parseTask.id,
      isComplete: parseTask.isComplete,
      progress: parseTask.analysisPercent,
      isError: parseTask.completion === 'Error',
      completionText: parseTask.completion,
    });
  });
}