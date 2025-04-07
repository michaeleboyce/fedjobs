// apps/api/src/app.ts
import express, { Express, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config} from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Create and configure the Express application
 */
export function createApp(): Express {
  const app = express();
  
  // Apply global middleware
  app.use(helmet());
  app.use(cors(config.cors));
  app.use(express.json());
  
  // Request logging
  if (config.env !== 'test') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }
  
  // Apply API routes
  app.use(config.apiPrefix, routes);
  
  // Apply error handling middleware
  app.use(notFoundHandler as RequestHandler);
  app.use(errorHandler);
  
  return app;
}