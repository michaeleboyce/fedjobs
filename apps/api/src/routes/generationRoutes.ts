// apps/api/src/routes/generationRoutes.ts
import { Router } from 'express';
import { Services } from '../services';

/**
 * Create generation routes
 */
export function createGenerationRoutes(services: Services): Router {
  const router = Router();
  const { generationController } = services;
  
  // Generate content
  router.post('/generate', generationController.generate);
  
  // Get generations by user
  router.get('/generations', generationController.getGenerationsByUserId);
  
  // Type-specific generate endpoints
  router.post('/generate/:type', (req, res, next) => {
    // Add type from URL to body
    req.body.type = req.params.type;
    generationController.generate(req, res, next);
  });
  
  // Paragraph regeneration endpoints
  router.post('/generate/:type/paragraph', (req, res, next) => {
    // Add type from URL to body and set isParagraph
    req.body.type = 'paragraph';
    req.body.documentType = req.params.type;
    generationController.generate(req, res, next);
  });
  
  return router;
}