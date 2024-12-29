// apps/api/src/routes/parsingStatus.ts

import express, { Router, Request, Response, NextFunction } from 'express';
import { db, eq, desc, getLatestParsingByDocId } from "@fedjobs/database";
import { parsings } from "@fedjobs/database/src/schema/parsings";
import { ApiError } from '../middleware/error';

const router: Router = express.Router();

/**
 * GET /api/parse/status/:documentId
 * Retrieves the latest parsing status for a specific document.
 */
router.get('/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(documentId)) {
      throw new ApiError(400, 'Invalid document ID');
    }

    // Use your new query function:
    const parseTask = await getLatestParsingByDocId(documentId);
    if (!parseTask) {
      throw new ApiError(404, 'No parsing task found for this document');
    }
    
    res.json({
      parseId: parseTask.id,
      isComplete: parseTask.isComplete,
      progress: parseTask.analysisPercent,
      isError: parseTask.completion === 'Error', // Adjust based on your error handling
      completionText: parseTask.completion,
    });
  } catch (error) {
    next(error);
  }
});

export { router as parsingStatusRouter };