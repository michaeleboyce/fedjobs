// File path: apps/api/src/index.ts
// apps/api/src/index.ts

import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { documentParseRouter } from './routes/documentParse'; // Document parsing route
import { generateRouter } from './routes/generate';  // Generate route
import { parseRouter } from './routes/parse';        // Parse route
import { parsingStatusRouter } from './routes/parsingStatus'; // Status route
import jobSourcesRouter from './routes/jobSources'; // Job sources route
import jobPostingsRouter from './routes/jobPostings'; // Job postings route
import { errorHandler } from './middleware/error';
import debug from 'debug';  
import { JobScraperService } from '@fedjobs/utils/src/Services/JobScraperService';

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

// Job-related routes
app.use('/api/job-sources', jobSourcesRouter);
app.use('/api/job-postings', jobPostingsRouter);

// Cron-like endpoint for scheduled refresh
app.post('/api/job-sources/scheduled-refresh', (req, res) => {
  try {
    const { frequency = 'DAILY' } = req.body;
    
    // Start refresh process in the background
    const jobScraperService = new JobScraperService();
    jobScraperService.scheduleRefresh(frequency)
      .catch(error => logger(`Error in scheduled refresh: ${error}`));
    
    res.json({ 
      message: `Scheduled job refresh started for frequency: ${frequency}`,
      status: 'STARTED'
    });
  } catch (error) {
    logger(`Error in scheduled refresh endpoint: ${error}`);
    res.status(500).json({ error: 'Failed to start scheduled refresh' });
  }
});

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
  console.log(`Document parsing endpoint: http://localhost:${port}/api/parse/document`);
  console.log(`Job sources endpoint: http://localhost:${port}/api/job-sources`);
});