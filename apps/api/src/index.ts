// apps/api/src/index.ts
import { createApp } from './app';
import { createServer } from './server';
import { config } from './config';
import { createWebSocketManager } from './services/realtime/webSocketManager';
import { getServices } from './services';
import createRoutes from './routes';

// Create Express app
const app = createApp();

// Create server
const server = createServer(app);

// Create WebSocket manager
const wsManager = createWebSocketManager(server.getHttpServer());

// Initialize services
const services = getServices(wsManager);

// Set up routes with services
app.use(config.apiPrefix, createRoutes(wsManager));

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Start the application
 */
async function start(): Promise<void> {
  try {
    await server.start();
    
    // Log server information
    console.log(`Environment: ${config.env}`);
    console.log(`API base URL: ${config.apiPrefix}`);
    
    // Register routes in development mode
    if (config.env === 'development') {
      console.log('Registered routes:');
      // @ts-ignore - App has this property but it's not in the types
      const routes = app._router.stack
        .filter((r: any) => r.route)
        .map((r: any) => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods).join(', ').toUpperCase(),
        }));
      
      routes.forEach((r: any) => {
        console.log(`${r.methods} ${config.apiPrefix}${r.path}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Gracefully shut down the application
 */
async function shutdown(): Promise<void> {
  console.log('Shutting down server...');
  
  try {
    await server.stop();
    console.log('Server stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the application
start();

// Export the server for testing
export { server, app };