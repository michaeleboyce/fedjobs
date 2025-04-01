// File path: apps/web/app/features/jobs/hooks/useWebSocketConnection.ts
// app/features/jobs/hooks/useWebSocketConnection.ts
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

  console.log(`Public URL is: ${apiUrl}`);
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  
  // Function to establish WebSocket connection
  const connect = useCallback(() => {
    try {
      // Close existing connection if any
      if (socketRef.current && socketRef.current.readyState < 2) {
        socketRef.current.close();
      }
      
      // Create new WebSocket connection
      socketRef.current = new WebSocket(wsUrl);
      
      // Set up event handlers
      socketRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempt(0);
        
        // Register with the server using userId
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'register',
            userId
          }));
        }
      };
      
      socketRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect with exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connect();
        }, timeout);
      };
      
      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
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
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userId, connect]);
  
  return {
    isConnected,
    addMessageHandler
  };
}