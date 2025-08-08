import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { asyncChatMessageService } from './async-chat-message.service';
import { devLogger } from '../../utils/logger.utils';
import { userRepository } from '../users/user.repository';

const realtimeChatRouter = new Hono();

/**
 * GET /api/chat/realtime/stream
 * Server-Sent Events stream for real-time chat system messages
 * This pushes file upload confirmations and transaction confirmations immediately
 */
realtimeChatRouter.get('/stream', async (c) => {
  // Get user email from query parameter since EventSource doesn't support custom headers
  const userEmail = c.req.query('userEmail');
  if (!userEmail) {
    return c.json({ error: 'userEmail query parameter is required' }, 400);
  }

  // Convert email to user ID (to match the backend processing)
  const user = await userRepository.findOrCreateUser(userEmail);
  const userId = user.id;

  devLogger('Realtime Chat', `🔌 Starting SSE stream for user: ${userId}`);

  // Add proper SSE headers for connection stability
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  c.header('Connection', 'keep-alive');
  c.header('Content-Type', 'text/event-stream; charset=utf-8');
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', 'Cache-Control');
  c.header('X-Accel-Buffering', 'no'); // Disable nginx buffering

  return streamSSE(c, async (stream) => {
    let messageId = 0;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let isStreamActive = true;
    
    const cleanup = () => {
      isStreamActive = false;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      asyncChatMessageService.unregisterRealtimeStream(userId);
      devLogger('Realtime Chat', `🔌 SSE stream cleaned up for user: ${userId}`);
    };

    // Set up abort handler 
    stream.onAbort(() => {
      devLogger('Realtime Chat', `🔌 SSE stream aborted for user: ${userId}`);
      cleanup();
    });

    try {
      // Send initial connection confirmation using proper Hono SSE format
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'connection_established',
          role: 'assistant',
          content: 'Conectado al sistema de mensajes en tiempo real',
          timestamp: new Date().toISOString()
        }),
        event: 'system',
        id: String(messageId++),
      });

      // Register this stream with the async message service for immediate delivery
      devLogger('Realtime Chat', `🔗 Registering stream callback for user ${userId}, stream ID: ${messageId}`);
      asyncChatMessageService.registerRealtimeStream(userId, async (message) => {
        devLogger('Realtime Chat', `🎯 CALLBACK INVOKED! Stream for user ${userId}, message type: ${message.type}, stream active: ${isStreamActive}`);
        
        if (!isStreamActive) {
          devLogger('Realtime Chat', `⚠️ Stream not active, message dropped for user ${userId}`);
          return;
        }
        
        try {
          // Convert async message to chat message format
          const chatMessage = {
            id: `system-${Date.now()}-${messageId++}`,
            role: 'assistant',
            content: `🔔 **${message.type === 'file_upload_success' ? 'Archivo Subido' : message.type === 'confirmation_request' ? 'Confirmación Requerida' : 'Notificación'}**\n\n${message.message}`,
            timestamp: message.timestamp.toISOString(),
            metadata: message.metadata
          };

          const sseData = {
            data: JSON.stringify(chatMessage),
            event: message.type,
            id: String(messageId++),
          };
          
          devLogger('Realtime Chat', `📡 About to write SSE data:`, sseData);
          await stream.writeSSE(sseData);
          devLogger('Realtime Chat', `✅ Real-time message sent to user ${userId}: ${message.type}`);
        } catch (error) {
          devLogger('Realtime Chat', `❌ Failed to send real-time message to user ${userId}: ${error}`);
          // Don't cleanup immediately on single message failure
          // Only cleanup if the stream is completely broken
          if (error.message?.includes('stream') || error.message?.includes('closed')) {
            cleanup();
          }
        }
      });

      // Start heartbeat with shorter interval for better connection stability
      heartbeatInterval = setInterval(async () => {
        if (!isStreamActive) return;
        
        try {
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            }),
            event: 'heartbeat',
            id: String(messageId++),
          });
        } catch (error) {
          devLogger('Realtime Chat', `❌ Heartbeat failed for user ${userId}: ${error}`);
          // Only cleanup if the heartbeat error indicates a closed stream
          if (error.message?.includes('closed') || error.message?.includes('stream')) {
            cleanup();
          }
        }
      }, 120000); // Every 2 minutes (well under the 4.25-minute timeout limit)

      // Keep the stream alive with proper Hono SSE approach
      while (isStreamActive) {
        try {
          await stream.sleep(60000); // Sleep for 1 minute at a time
        } catch (error) {
          devLogger('Realtime Chat', `❌ Stream sleep interrupted for user ${userId}: ${error}`);
          break;
        }
      }
      
    } catch (error) {
      devLogger('Realtime Chat', `❌ SSE stream error for user ${userId}: ${error}`);
    } finally {
      cleanup();
    }
  });
});

export { realtimeChatRouter };