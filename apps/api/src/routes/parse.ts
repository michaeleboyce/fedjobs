// File path: apps/api/src/routes/parse.ts
// apps/api/src/routes/parse.ts

import express, { Router, Request, Response, NextFunction } from 'express';
import { ParseRequestSchema, ParseRequest } from '@fedjobs/types';
import { parsingService } from '../services/parsingService'; // Adjust the path as necessary
import { ApiError } from '../middleware/error';

const router: Router = express.Router();

router.post('/', async (req: Request<{}, {}, ParseRequest>, res: Response, next: NextFunction) => {
  try {
    // Validate incoming request body using Zod or similar schema validator
    const validation = ParseRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.debug(validation.error.format());
      throw new ApiError(400, 'Invalid request body');
    }

    // Extract typed data
    const { text, userId, documentId, streaming = false, addToKnowledgeBank } = validation.data;

    // Initiate parsing based on the streaming flag
    if (streaming) {
      // Logs into DB, tracks progress, returns an ID
      const parseId = await parsingService.parseWithLoggingAndStreaming({
        text,
        userId,
        documentId,
        streaming,
        addToKnowledgeBank
      });
      // Return parseId so that the client can poll
      // some “GET /api/parse/status/:parseId” endpoint.
      res.status(200).json({ parseId, streaming: true });
    } else {
      // Immediately do a synchronous parse with no DB logging
      const annotatedText = await parsingService.parseSyncOrNoLog({
        text,
        userId,
        documentId,
        streaming,
        addToKnowledgeBank
      });
      res.status(200).json({ annotatedText, streaming: false });
    }
  } catch (error) {
    next(error);
  }
});

export { router as parseRouter };
