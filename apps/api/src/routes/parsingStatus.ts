// File path: apps/api/src/routes/parsingStatus.ts
// apps/api/src/routes/parsingStatus.ts

import express, { Router, Request, Response, NextFunction } from 'express';
import { ParsingRepository } from "@fedjobs/database";
import { ApiError } from '../middleware/error';

const router: Router = express.Router();
const parsingRepository = new ParsingRepository(); // Instantiate your repository here

router.get('/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(documentId)) {
      throw new ApiError(400, 'Invalid document ID');
    }

    // Use the ParsingRepository's method getLatestByDocumentId
    const parseTask = await parsingRepository.getLatestByDocumentId(documentId);
    if (!parseTask) {
      throw new ApiError(404, 'No parsing task found for this document');
    }
    
    res.json({
      parseId: parseTask.id,
      isComplete: parseTask.isComplete,
      progress: parseTask.analysisPercent,
      isError: parseTask.completion === 'Error',
      completionText: parseTask.completion,
    });
  } catch (error) {
    next(error);
  }
});

export { router as parsingStatusRouter };
