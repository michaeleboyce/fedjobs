// File path: apps/web/app/shared/hooks/useWebSocketConnection.ts
// app/shared/hooks/useWebSocketConnection.ts
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: any;
}

type MessageHandler = (message: WebSocketMessage) => void;

export default function useWebSocketConnection(userId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  
  // Get API URL from environment or use default
  const apiUrl = process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "https://fedjobs-api-production.up.railway.app" : "http://localhost:3001"; // Adjust port as needed

  const wsUrl = apiUrl.replace(/^http/, 'ws');
  
  // Function to establish WebSocket connection
  const connect = useCallback(() => {
    try {
      // Check if there's an existing connection and it's already open or connecting
      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          console.log('WebSocket already connected, skipping reconnect');
          return; // Already connected, don't create a new connection
        } else if (socketRef.current.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket already connecting, skipping reconnect');
          return; // Already trying to connect, don't create a new connection
        } else {
          // Close if it's closing or closed
          console.log('Closing existing WebSocket connection');
          socketRef.current.close();
        }
      }
      
      console.log('Creating new WebSocket connection');
      
      // Create new WebSocket connection
      socketRef.current = new WebSocket(wsUrl);
      
      // Set up event handlers
      socketRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempt(0);
        
        // Register with the server using userId
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          console.log('Sending registration message with userId', userId);
          socketRef.current.send(JSON.stringify({
            type: 'register',
            userId
          }));
        }
      };
      
      socketRef.current.onclose = (event) => {
        console.log(`WebSocket disconnected with code ${event.code}, reason: ${event.reason || 'No reason provided'}`);
        setIsConnected(false);
        
        // Clean up any existing timeout to avoid duplicates
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Only attempt to reconnect if we haven't already hit a high reconnect count
        if (reconnectAttempt < 10) {
          // Attempt to reconnect with exponential backoff
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
          console.log(`Will attempt to reconnect in ${timeout}ms (attempt ${reconnectAttempt + 1})`);
          
          // Create and store the timeout
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            reconnectTimeoutRef.current = null;
            connect();
          }, timeout);
        } else {
          console.log('Maximum reconnection attempts reached, giving up');
        }
      };
      
      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't close here, let the onclose handler manage reconnection
      };
      
      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle specific system messages
          if (message.type === 'heartbeat') {
            // Heartbeat received, connection is alive
            console.log('Heartbeat received from server');
            return;
          }
          
          if (message.type === 'pong') {
            // Pong received in response to our ping
            console.log('Pong received from server');
            return;
          }
          
          // Dispatch to appropriate handlers
          const handlers = messageHandlersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message));
          }
          
          // Also dispatch to wildcard handlers
          const wildcardHandlers = messageHandlersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => handler(message));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
    }
  }, [userId, wsUrl, reconnectAttempt]);
  
  // Register message handler
  const addMessageHandler = useCallback((type: string, handler: MessageHandler) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, new Set());
    }
    messageHandlersRef.current.get(type)?.add(handler);
    
    // Return cleanup function
    return () => {
      messageHandlersRef.current.get(type)?.delete(handler);
      if (messageHandlersRef.current.get(type)?.size === 0) {
        messageHandlersRef.current.delete(type);
      }
    };
  }, []);
  
  // Keep track of reconnection timeouts
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep track of heartbeat interval
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to send a ping to keep connection alive
  const sendPing = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending ping to WebSocket server');
      socketRef.current.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (userId) {
      // Only connect if we don't already have an active connection
      if (!socketRef.current || socketRef.current.readyState > WebSocket.OPEN) {
        console.log('Initializing WebSocket connection for userId', userId);
        connect();
      }
      
      // Set up regular pings to keep connection alive
      if (heartbeatIntervalRef.current === null) {
        heartbeatIntervalRef.current = setInterval(sendPing, 25000); // Send ping every 25 seconds
      }
    }
    
    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection');
      
      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        console.log('Clearing heartbeat interval');
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        console.log('Clearing reconnection timeout');
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close the WebSocket if it exists
      if (socketRef.current) {
        console.log('Closing WebSocket connection on unmount');
        
        // Remove all event handlers to prevent potential reconnection attempts
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        
        // Close the connection
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [userId, connect, sendPing]);
  
  return {
    isConnected,
    addMessageHandler
  };
}