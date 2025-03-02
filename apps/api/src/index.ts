// File path: apps/api/src/index.ts
// apps/api/src/index.ts

import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { documentParseRouter } from './routes/documentParse'; // New document parsing route
import { generateRouter } from './routes/generate';  // Existing generate route
import { parseRouter } from './routes/parse';        // Existing parse route
import { parsingStatusRouter } from './routes/parsingStatus'; // New status route
import { errorHandler } from './middleware/error';
import debug from 'debug';  

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());

const logger = debug('api:server');
app.use((req, _res, next) => {
  logger(`Incoming ${req.method} request to ${req.path}`);
  next();
});


// Existing routes
app.use('/api/generate', generateRouter);
app.use('/api/parse', parseRouter);

// New parsing status route
app.use('/api/parse/status', parsingStatusRouter);
// Add logging before the route
app.use('/api/parse/document', (req, _res, next) => {
  logger('Hit document parse route handler');
  next();
}, documentParseRouter);
app.use((req, res, next) => {
  logger(`No route found for ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Route not found' });
});
// Error handling
app.use(errorHandler as ErrorRequestHandler);

const port = config.port || 3001;
console.log('Registered routes:', 
  app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }))
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});