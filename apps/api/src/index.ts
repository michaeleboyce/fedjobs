// apps/api/src/index.ts

import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { generateRouter } from './routes/generate';  // Existing generate route
import { parseRouter } from './routes/parse';        // Existing parse route
import { parsingStatusRouter } from './routes/parsingStatus'; // New status route
import { errorHandler } from './middleware/error';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());

// Existing routes
app.use('/api/generate', generateRouter);
app.use('/api/parse', parseRouter);

// New parsing status route
app.use('/api/parse/status', parsingStatusRouter);

// Error handling
app.use(errorHandler as ErrorRequestHandler);

const port = config.port || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});