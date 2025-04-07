// apps/api/src/routes/parseRoutes.ts
import { Router } from 'express';
import { Services } from '../services';

/**
 * Create parsing routes
 */
export function createParseRoutes(services: Services): Router {
  const router = Router();
  const { parsingController } = services;
  
  // Parse document
  router.post('/parse', parsingController.parseDocument);
  
  // Get parsing status
  router.get('/parse/status/:documentId', parsingController.getParsingStatus);
  
  return router;
}