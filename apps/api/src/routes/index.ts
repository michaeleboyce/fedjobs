// apps/api/src/routes/index.ts
import { Router } from 'express';
import { WebSocketManager } from '../services/realtime/webSocketManager';
import { getServices } from '../services';
import { createJobRoutes } from './jobRoutes';
import { createDocumentRoutes } from './documentRoutes';
import { createParseRoutes } from './parseRoutes';
import { createGenerationRoutes } from './generationRoutes';

/**
 * Create all API routes
 */
export default function createRoutes(wsManager: WebSocketManager): Router {
  const router = Router();
  
  // Get services with dependency injection
  const services = getServices(wsManager);
  
  // Apply route groups
  router.use(createJobRoutes(services));
  router.use(createDocumentRoutes(services));
  router.use(createParseRoutes(services));
  router.use(createGenerationRoutes(services));
  
  // Health check route
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  return router;
}