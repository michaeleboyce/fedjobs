// apps/api/src/server.ts
import http from 'http';
import { Express } from 'express';
import { config } from './config';
import { createWebSocketManager, WebSocketManager } from './services/realtime/webSocketManager';

/**
 * Server instance with WebSocket support
 */
export class Server {
  private httpServer: http.Server;
  private wsManager: WebSocketManager;
  
  /**
   * Create a new server instance
   */
  constructor(app: Express) {
    this.httpServer = http.createServer(app);
    this.wsManager = createWebSocketManager(this.httpServer);
  }
  
  /**
   * Start the server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      const port = config.port;
      
      this.httpServer.listen(port, () => {
        console.log(`HTTP Server running on port ${port}`);
        console.log(`WebSocket Server running on ws://localhost:${port}`);
        resolve();
      });
    });
  }
  
  /**
   * Stop the server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsManager.close();
      
      this.httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Get the HTTP server instance
   */
  public getHttpServer(): http.Server {
    return this.httpServer;
  }
  
  /**
   * Get the WebSocket manager
   */
  public getWebSocketManager(): WebSocketManager {
    return this.wsManager;
  }
}

/**
 * Create a new server
 */
export function createServer(app: Express): Server {
  return new Server(app);
}