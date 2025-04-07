import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';

// Export a map to keep track of WebSocket clients by userId.
export const userWsClients = new Map<string, Set<WebSocket & { isAlive: boolean; userId?: string }>>();

// Initialize the WebSocket server and attach event handlers.
export function initWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    // Extend the WebSocket object.
    const extendedWs = ws as WebSocket & { isAlive: boolean; userId?: string };
    extendedWs.isAlive = true;

    // Handle pong responses.
    extendedWs.on('pong', () => {
      extendedWs.isAlive = true;
    });

    // Listen for incoming messages.
    extendedWs.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);

        // Handle simple ping messages.
        if (data.type === 'ping') {
          extendedWs.isAlive = true;
          extendedWs.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // Handle registration messages (e.g. userId assignment).
        if (data.type === 'register' && data.userId) {
          const userId = data.userId;
          extendedWs.userId = userId;
          if (!userWsClients.has(userId)) {
            userWsClients.set(userId, new Set());
          }
          userWsClients.get(userId)?.add(extendedWs);
          console.log(`WebSocket client registered for user ${userId}`);
          extendedWs.send(JSON.stringify({
            type: 'registration_successful',
            timestamp: new Date().toISOString(),
            message: 'Successfully registered for real-time updates'
          }));

          // Set up a periodic keepalive message.
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
          }, 30000);
          extendedWs.on('close', () => {
            clearInterval(keepaliveInterval);
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Cleanup on close.
    extendedWs.on('close', () => {
      console.log('WebSocket client disconnected');
      if (extendedWs.userId) {
        const clients = userWsClients.get(extendedWs.userId);
        if (clients) {
          clients.delete(extendedWs);
          if (clients.size === 0) {
            userWsClients.delete(extendedWs.userId);
          }
        }
      } else {
        userWsClients.forEach((clients, userId) => {
          if (clients.has(extendedWs)) {
            clients.delete(extendedWs);
            if (clients.size === 0) {
              userWsClients.delete(userId);
            }
          }
        });
      }
    });

    // Handle connection errors.
    extendedWs.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send an initial heartbeat message.
    extendedWs.send(JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      message: 'Connection established'
    }));
  });

  // Set up a heartbeat interval to check for dead connections.
  const heartbeatInterval = setInterval(() => {
    let activeConnections = 0;
    let terminatedConnections = 0;

    wss.clients.forEach((ws) => {
      const extendedWs = ws as WebSocket & { isAlive: boolean };
      if (extendedWs.isAlive === false) {
        terminatedConnections++;
        return extendedWs.terminate();
      }
      extendedWs.isAlive = false;
      activeConnections++;
      try {
        extendedWs.ping();
        extendedWs.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Error sending heartbeat:', err);
        extendedWs.terminate();
        terminatedConnections++;
      }
    });
    console.log(`WebSocket status: ${activeConnections} active, ${terminatedConnections} terminated`);
  }, 30000);

  // Clear the interval when the server closes.
  server.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}
