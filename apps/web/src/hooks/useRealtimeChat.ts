import { useEffect, useRef, useCallback } from 'react';
import type { Message } from '@ai-sdk/react';
import { config } from '@/config';

interface RealtimeMessage {
  id: string;
  role: 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface UseRealtimeChatProps {
  userEmail?: string;
  onMessage: (message: Message) => void;
  enabled?: boolean;
}

export function useRealtimeChat({ 
  userEmail, 
  onMessage, 
  enabled = true 
}: UseRealtimeChatProps) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10; // Increased since connections should be more stable now

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !userEmail) {
      console.log('❌ Connect aborted - enabled:', enabled, 'userEmail:', userEmail);
      return;
    }

    if (eventSourceRef.current) {
      console.log('⚠️ EventSource already exists, skipping connection');
      return;
    }

    console.log('🔌 Connecting to realtime chat stream...', { userEmail, enabled });

    const eventSource = new EventSource(
      `${config.API_BASE_URL}/api/chat/realtime/stream?userEmail=${encodeURIComponent(userEmail)}`,
      {
        // Add custom options for better connection handling
        withCredentials: false
      }
    );

    eventSource.onopen = () => {
      console.log('✅ Realtime chat connected', {
        readyState: eventSource.readyState,
        url: eventSource.url
      });
      reconnectAttempts.current = 0;
    };

    // All events are now handled by the universal handleAnyEvent function above

    eventSource.addEventListener('heartbeat', () => {
      // Silent heartbeat
    });

    // Add a universal listener for ANY event type
    const handleAnyEvent = (event: MessageEvent) => {
      console.log(`🎯 Event received [${event.type}]:`, {
        data: event.data,
        type: event.type,
        lastEventId: event.lastEventId
      });
      
      // Try to process as chat message regardless of event type
      try {
        const parsed = JSON.parse(event.data);
        
        // Handle connection established message (has different structure)
        if (parsed.type === 'connection_established' && !parsed.id) {
          console.log('🔌 Connection established:', parsed);
          const chatMessage: Message = {
            id: `connection-${Date.now()}`,
            role: 'assistant',
            content: parsed.content,
            createdAt: new Date(parsed.timestamp),
          };
          onMessage(chatMessage);
        }
        // Handle regular system messages (file upload, confirmations, etc.)
        else if (parsed.id && parsed.role === 'assistant' && parsed.content && parsed.timestamp) {
          console.log('🚀 Processing event as chat message:', parsed);
          const chatMessage: Message = {
            id: parsed.id,
            role: parsed.role,
            content: parsed.content,
            createdAt: new Date(parsed.timestamp),
          };
          console.log('🎯 About to call onMessage with:', chatMessage);
          onMessage(chatMessage);
          console.log('✅ onMessage called successfully');
        }
      } catch (e) {
        console.log('Failed to parse event data:', e);
      }
    };

    ['file_upload_success', 'confirmation_request', 'transaction_confirmed', 'system'].forEach(eventType => {
      eventSource.addEventListener(eventType, handleAnyEvent);
    });

    // Generic message listener to catch ALL events (onmessage catches events without explicit types)
    eventSource.onmessage = (event) => {
      console.log('📨 Raw SSE message received via onmessage:', {
        data: event.data,
        type: event.type,
        lastEventId: event.lastEventId,
        origin: event.origin,
        timeStamp: event.timeStamp
      });
      
      // Try to parse and show the content
      try {
        const parsed = JSON.parse(event.data);
        console.log('📨 Parsed message:', parsed);
        
        // Process ALL system messages that arrive via SSE
        if (parsed.id && parsed.role === 'assistant' && parsed.content && parsed.timestamp) {
          console.log('🎯 Processing SSE message as chat message:', parsed);
          const chatMessage: Message = {
            id: parsed.id,
            role: parsed.role,
            content: parsed.content,
            createdAt: new Date(parsed.timestamp),
          };
          onMessage(chatMessage);
        }
      } catch (e) {
        console.log('📨 Non-JSON message:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Realtime chat connection error:', error, 'ReadyState:', eventSource.readyState);
      
      // Only cleanup and reconnect if the connection is actually closed
      if (eventSource.readyState === EventSource.CLOSED) {
        cleanup();
        
        // Exponential backoff reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached. Realtime chat disabled.');
        }
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        console.log('⏳ Connection is still attempting to establish...');
      }
    };

    eventSourceRef.current = eventSource;
  }, [enabled, userEmail, onMessage, cleanup]);

  useEffect(() => {
    console.log('🔄 useEffect triggered - enabled:', enabled, 'userEmail:', userEmail);
    if (enabled && userEmail) {
      connect();
    }
    return cleanup;
  }, [enabled, userEmail]); // Remove connect from dependencies to prevent loops

  // Expose manual reconnect function
  const reconnect = useCallback(() => {
    cleanup();
    reconnectAttempts.current = 0;
    connect();
  }, [cleanup, connect]);

  return {
    isConnected: !!eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN,
    reconnect,
  };
}