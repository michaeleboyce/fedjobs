import express, { Router, Request, Response, NextFunction } from 'express';
import { ParseRequestSchema, ParseRequest } from '@fedjobs/types';
import { parsingService } from '../services/parsingService'; // Or wherever you keep it
import { ApiError } from '../middleware/error';

const router: Router = express.Router();

router.post('/', async (req: Request<{}, {}, ParseRequest>, res: Response, next: NextFunction) => {
  try {
    // Validate incoming request body
    const validation = ParseRequestSchema.safeParse(req.body);
    if (!validation.success) {
      console.debug(validation.error.format());
      throw new ApiError(400, 'Invalid request body');
    }

    // Extract typed data
    const { text, userId, documentId, streaming = false } = validation.data;

    // Decide streaming or not
    if (streaming) {
      // Logs into DB, tracks progress, returns an ID
      const parseId = await parsingService.parseWithLoggingAndStreaming({
        text,
        userId,
        documentId
      });
      // You might want to return parse ID so that the client can poll
      // some “GET /api/parse/status/:parseId” endpoint.
      res.json({ parseId, streaming: true });
    } else {
      // Immediately do a synchronous parse with no DB logging
      const annotatedText = await parsingService.parseSyncOrNoLog({
        text,
        userId,
        documentId
      });
      res.json({ annotatedText, streaming: false });
    }
  } catch (error) {
    next(error);
  }
});

export { router as parseRouter };