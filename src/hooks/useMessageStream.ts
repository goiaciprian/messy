import { useEffect, useRef, useCallback } from 'react';
import { MessageWithUser } from '~/lib/queries.drizzle';

interface UseMessageStreamProps {
  onNewMessage: (message: MessageWithUser) => void;
  onConnectionChange: (connected: boolean) => void;
}

export function useMessageStream({ onNewMessage, onConnectionChange }: UseMessageStreamProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    console.log('Attempting to connect to SSE...');
    
    // Don't create multiple connections
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('SSE already connected');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('Closing existing SSE connection');
      eventSourceRef.current.close();
    }

    try {
      console.log('Creating new EventSource connection to /api/messages/stream');
      const eventSource = new EventSource('/api/messages/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection opened successfully');
        reconnectAttempts.current = 0;
        onConnectionChange(true);
      };

      eventSource.onmessage = (event) => {
        console.log('SSE message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('Connected to message stream');
          } else if (data.type === 'new_message' && data.message) {
            console.log('New message received via SSE:', data.message);
            onNewMessage(data.message);
          } else {
            console.log('Unknown SSE message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        console.log('EventSource readyState:', eventSource.readyState);
        onConnectionChange(false);
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          reconnectAttempts.current++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      onConnectionChange(false);
    }
  }, [onNewMessage, onConnectionChange]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting SSE...');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    onConnectionChange(false);
  }, [onConnectionChange]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    console.log('useMessageStream: Setting up SSE connection');
    connect();
    
    return () => {
      console.log('useMessageStream: Cleaning up SSE connection');
      disconnect();
    };
  }, [connect, disconnect]);

  // Return connection control functions
  return {
    connect,
    disconnect,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  };
} 