// apps/api/src/services/realtime/webSocketManager.ts
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { env } from '../../config/environment';

/**
 * Extended WebSocket with additional properties
 */
export interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
}

/**
 * WebSocket event type
 */
export type WebSocketEventType = 
  | 'heartbeat'
  | 'keepalive'
  | 'registration_successful'
  | 'job_source_created'
  | 'job_source_refresh_started'
  | 'job_found'
  | 'crawl_complete'
  | 'crawl_error'
  | 'crawl_cancelled'
  | 'pong';

/**
 * WebSocket message payload
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  timestamp: string;
  data?: T;
  message?: string;
}

/**
 * WebSocket manager for handling client connections and messages
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private userClients: Map<string, Set<ExtendedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize the WebSocket manager
   */
  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });
    this.setupEventHandlers();
    this.startHeartbeat();
  }
  
  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;
      
      console.log('WebSocket client connected');
      
      // Handle pong messages to track liveness
      extWs.on('pong', () => {
        extWs.isAlive = true;
      });
      
      // Handle messages (including registration)
      extWs.on('message', (message: string) => {
        this.handleClientMessage(extWs, message);
      });
      
      // Handle disconnection
      extWs.on('close', () => {
        this.removeClient(extWs);
        console.log('WebSocket client disconnected');
      });
      
      // Handle errors
      extWs.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      // Send initial heartbeat
      this.sendToClient(extWs, {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        message: 'Connection established'
      });
    });
  }
  
  /**
   * Handle client messages (including registration)
   */
  private handleClientMessage(ws: ExtendedWebSocket, rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage);
      
      // Handle ping messages directly
      if (message.type === 'ping') {
        ws.isAlive = true;
        this.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Handle registration messages
      if (message.type === 'register' && message.userId) {
        this.registerClient(ws, message.userId);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }
  
  /**
   * Register a client with a user ID
   */
  private registerClient(ws: ExtendedWebSocket, userId: string): void {
    ws.userId = userId;
    
    // Store client connection by userId
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    
    this.userClients.get(userId)?.add(ws);
    console.log(`WebSocket client registered for user ${userId}`);
    
    // Send acknowledgement
    this.sendToClient(ws, {
      type: 'registration_successful',
      timestamp: new Date().toISOString(),
      message: 'Successfully registered for real-time updates'
    });
    
    // Start a keepalive interval for this client
    this.startKeepaliveForClient(ws);
  }
  
  /**
   * Remove a client from tracking
   */
  private removeClient(ws: ExtendedWebSocket): void {
    // If we have a userId stored, use it for faster cleanup
    if (ws.userId) {
      const clients = this.userClients.get(ws.userId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          this.userClients.delete(ws.userId);
        }
      }
    } else {
      // Fall back to checking all clients
      this.userClients.forEach((clients, userId) => {
        if (clients.has(ws)) {
          clients.delete(ws);
          
          // Clean up empty sets
          if (clients.size === 0) {
            this.userClients.delete(userId);
          }
        }
      });
    }
  }
  
  /**
   * Start heartbeat interval to check for dead connections
   */
  private startHeartbeat(): void {
    const interval = env.WS_PING_INTERVAL_MS;
    
    this.heartbeatInterval = setInterval(() => {
      let activeConnections = 0;
      let terminatedConnections = 0;
      
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;
        
        if (extWs.isAlive === false) {
          // Connection is dead, terminate it
          terminatedConnections++;
          extWs.terminate();
          return;
        }
        
        // Mark as inactive for next cycle
        extWs.isAlive = false;
        activeConnections++;
        
        // Send a ping
        try {
          extWs.ping();
          
          // Also send a heartbeat message
          this.sendToClient(extWs, {
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          // If sending fails, terminate the connection
          console.error('Error sending heartbeat:', err);
          extWs.terminate();
          terminatedConnections++;
        }
      });
      
      if (activeConnections > 0 || terminatedConnections > 0) {
        console.log(`WebSocket status: ${activeConnections} active connections, ${terminatedConnections} terminated`);
      }
    }, interval);
  }
  
  /**
   * Start a keepalive interval for a specific client
   */
  private startKeepaliveForClient(ws: ExtendedWebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          this.sendToClient(ws, { 
            type: 'keepalive',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error sending keepalive message:', error);
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 30000); // Send keepalive every 30 seconds
    
    // Clear interval when WebSocket closes
    ws.on('close', () => {
      clearInterval(interval);
    });
  }
  
  /**
   * Send a message to a specific client
   */
  private sendToClient(ws: ExtendedWebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }
  
  /**
   * Send a message to all clients of a specific user
   */
  public sendToUser(userId: string, message: WebSocketMessage): void {
    const clients = this.userClients.get(userId);
    if (!clients || clients.size === 0) {
      console.log(`No connected WebSocket clients for user ${userId}`);
      return;
    }
    
    let sentCount = 0;
    let errorCount = 0;
    
    clients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
          sentCount++;
        }
      } catch (error) {
        errorCount++;
        console.error('Error sending WebSocket message to client:', error);
      }
    });
    
    console.log(`WebSocket '${message.type}' update sent to ${sentCount}/${clients.size} clients for user ${userId} (${errorCount} errors)`);
  }
  
  /**
   * Clean up resources
   */
  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    this.wss.clients.forEach(client => {
      try {
        client.terminate();
      } catch (error) {
        console.error('Error terminating client:', error);
      }
    });
  }
}

// Export a factory function to create the manager
export function createWebSocketManager(server: HttpServer): WebSocketManager {
  return new WebSocketManager(server);
}