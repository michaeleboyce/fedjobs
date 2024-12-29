// apps/api/src/routes/documentParse.ts

import express, { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { processDocumentTextFromBuffer } from '../backend-utils/DocumentParsers';
import { ApiError } from '../middleware/error';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const router: Router = express.Router();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Validate file types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
    }
  }
});

// Add error handling for multer errors
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: 'File is too large. Maximum size is 10MB',
          isInvalidDocType: false
        });
      }
      return res.status(400).json({
        message: err.message,
        isInvalidDocType: false
      });
    } else if (err) {
      return res.status(400).json({
        message: err.message,
        isInvalidDocType: true
      });
    }
    
    // If no error, proceed with file processing
    handleFileProcessing(req, res, next);
  });
});

// Separate handler for file processing
async function handleFileProcessing(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        isInvalidDocType: false
      });
    }

    const { buffer, mimetype } = req.file;
    const parseResult = await processDocumentTextFromBuffer(buffer, mimetype);

    if (parseResult.success) {
      res.json({ text: parseResult.success.text, type: parseResult.success.type });
    } else {
      res.status(400).json(parseResult.failure);
    }
  } catch (error) {
    next(error);
  }
}
export { router as documentParseRouter };
