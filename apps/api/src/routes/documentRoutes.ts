// apps/api/src/routes/documentRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { Services } from '../services';
import { config } from '../config';
import { BadRequestError } from '../utils/errors';

/**
 * Create document routes
 */
export function createDocumentRoutes(services: Services): Router {
  const router = Router();
  const { documentController } = services;
  
  // Configure multer for memory storage
  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: {
      fileSize: config.parsing.maxFileSizeMB * 1024 * 1024, // Convert MB to bytes
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
        cb(new BadRequestError('Invalid file type. Only PDF and Word documents are allowed.'));
      }
    }
  });
  
  // Add upload handler for file processing
  router.post('/documents/parse', upload.single('file'), documentController.parseDocument);
  
  // Document management routes
  router.get('/documents', documentController.getDocumentsByUserId);
  router.get('/documents/:id', documentController.getDocumentById);
  router.get('/documents/:id/url', documentController.getSignedUrl);
  router.put('/documents/:id', documentController.updateDocument);
  router.delete('/documents/:id', documentController.deleteDocument);
  
  return router;
}