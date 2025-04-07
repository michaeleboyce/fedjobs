// File path: apps/api/src/index.ts
import express, { ErrorRequestHandler } from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
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
import { createScraperService } from '@fedjobs/crawler';

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set up WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Create a Map to store WebSocket clients by userId
export const userWsClients = new Map<string, Set<WebSocket & { isAlive: boolean; userId?: string }>>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  
  // Add isAlive property to the WebSocket object
  const extendedWs = ws as WebSocket & { isAlive: boolean; userId?: string };
  extendedWs.isAlive = true;
  
  // Set up ping handler
  extendedWs.on('pong', () => {
    extendedWs.isAlive = true;
  });
  
  // Handle connection messages (including userId)
  extendedWs.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      // Handle ping messages directly
      if (data.type === 'ping') {
        extendedWs.isAlive = true;
        extendedWs.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        return;
      }
      
      // If this is a registration message with userId
      if (data.type === 'register' && data.userId) {
        const userId = data.userId;
        extendedWs.userId = userId;
        
        // Store client connection by userId
        if (!userWsClients.has(userId)) {
          userWsClients.set(userId, new Set());
        }
        userWsClients.get(userId)?.add(extendedWs);
        
        console.log(`WebSocket client registered for user ${userId}`);
        
        // Send acknowledgement
        extendedWs.send(JSON.stringify({ 
          type: 'registration_successful',
          timestamp: new Date().toISOString(),
          message: 'Successfully registered for real-time updates'
        }));
        
        // Also send an online status message periodically to keep the connection alive
        const keepaliveInterval = setInterval(() => {
          if (extendedWs.readyState === WebSocket.OPEN) {
            try {
              extendedWs.send(JSON.stringify({ 
                type: 'keepalive',
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              console.error('Error sending keepalive message:', error);
              clearInterval(keepaliveInterval);
            }
          } else {
            clearInterval(keepaliveInterval);
          }
        }, 30000); // Send keepalive every 30 seconds
        
        // Clear interval when WebSocket closes
        extendedWs.on('close', () => {
          clearInterval(keepaliveInterval);
        });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  extendedWs.on('close', () => {
    console.log('WebSocket client disconnected');
    
    // If we have a userId stored, use it for faster cleanup
    if (extendedWs.userId) {
      const clients = userWsClients.get(extendedWs.userId);
      if (clients) {
        clients.delete(extendedWs);
        if (clients.size === 0) {
          userWsClients.delete(extendedWs.userId);
        }
      }
    } else {
      // Fall back to checking all clients
      userWsClients.forEach((clients, userId) => {
        if (clients.has(extendedWs)) {
          clients.delete(extendedWs);
          
          // Clean up empty sets
          if (clients.size === 0) {
            userWsClients.delete(userId);
          }
        }
      });
    }
  });
  
  // Handle errors
  extendedWs.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  // Send initial heartbeat
  extendedWs.send(JSON.stringify({
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
    message: 'Connection established'
  }));
});

// Set up interval to check for dead connections and send heartbeats
const heartbeatInterval = setInterval(() => {
  let activeConnections = 0;
  let terminatedConnections = 0;
  
  wss.clients.forEach((ws) => {
    const extendedWs = ws as WebSocket & { isAlive: boolean };
    
    if (extendedWs.isAlive === false) {
      // Connection is dead, terminate it
      terminatedConnections++;
      return extendedWs.terminate();
    }
    
    // Mark as inactive for next cycle
    extendedWs.isAlive = false;
    activeConnections++;
    
    // Send a ping
    try {
      extendedWs.ping();
      
      // Also send a heartbeat message
      extendedWs.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      // If sending fails, terminate the connection
      console.error('Error sending heartbeat:', err);
      extendedWs.terminate();
      terminatedConnections++;
    }
  });
  
  console.log(`WebSocket status: ${activeConnections} active connections, ${terminatedConnections} terminated`);
}, 30000); // Check every 30 seconds

// Clean up interval on server close
server.on('close', () => {
  clearInterval(heartbeatInterval);
});

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
    
    // Create ScraperService using the factory function that initializes all dependencies
    const jobScraperService = createScraperService();
    
    // Start refresh process in the background
    jobScraperService.scheduleRefresh(frequency)
      .catch((error: Error) => logger(`Error in scheduled refresh: ${error.message}`));
    
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

server.listen(port, () => {
  console.log(`HTTP Server running on port ${port}`);
  console.log(`WebSocket Server running on ws://localhost:${port}`);
  console.log(`Document parsing endpoint: http://localhost:${port}/api/parse/document`);
  console.log(`Job sources endpoint: http://localhost:${port}/api/job-sources`);
});