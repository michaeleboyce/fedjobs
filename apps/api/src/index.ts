import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { generateRouter } from './routes/generate';
import { errorHandler } from './middleware/error';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/generate', generateRouter);

// Error handling
app.use(errorHandler as ErrorRequestHandler);


const port = config.port || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});