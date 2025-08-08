import { devLogger } from "../../utils/logger.utils";
import type { CoreMessage } from "ai";

export interface AsyncChatMessage {
  userId: string;
  message: string;
  type: 'system' | 'confirmation_request' | 'file_upload_success' | 'transaction_confirmed' | 'error';
  metadata?: {
    processingLogId?: string;
    transactionData?: any;
    requiresConfirmation?: boolean;
    confirmationTimeout?: number;
  };
  timestamp: Date;
}

// In-memory store for pending async messages per user
// In production, this should be stored in Redis or database
export interface UserAsyncMessages {
  userId: string;
  pendingMessages: AsyncChatMessage[];
  lastRetrieved: Date;
}

/**
 * Service to handle async messages that get injected into chat conversations
 * Messages are stored and retrieved when user sends new chat messages
 */
export class AsyncChatMessageService {
  // Store pending messages per user (in production, use Redis/DB)
  private userMessages = new Map<string, UserAsyncMessages>();
  
  // Store realtime stream callbacks for immediate message delivery
  private realtimeStreams = new Map<string, (message: AsyncChatMessage) => Promise<void>>();

  /**
   * Send an async message to user - tries realtime first, falls back to storage
   */
  async sendMessageToUser(message: AsyncChatMessage): Promise<void> {
    devLogger('AsyncChatMessage', `📤 Sending async message for user ${message.userId}`, {
      type: message.type,
      messagePreview: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
      hasMetadata: !!message.metadata
    });

    // Try to send immediately via realtime stream if available
    const realtimeCallback = this.realtimeStreams.get(message.userId);
    devLogger('AsyncChatMessage', `🔍 Checking for realtime stream - userId: ${message.userId}, hasCallback: ${!!realtimeCallback}, totalStreams: ${this.realtimeStreams.size}`);
    
    if (realtimeCallback) {
      try {
        devLogger('AsyncChatMessage', `🚀 About to invoke realtime callback for user ${message.userId}`);
        await realtimeCallback(message);
        devLogger('AsyncChatMessage', `✅ Message sent immediately via realtime stream to user ${message.userId}`);
        return;
      } catch (error) {
        devLogger('AsyncChatMessage', `⚠️ Failed to send via realtime stream, falling back to storage: ${error}`);
        // Remove broken stream
        this.realtimeStreams.delete(message.userId);
      }
    } else {
      devLogger('AsyncChatMessage', `❌ No realtime callback found for user ${message.userId}. Available users: ${Array.from(this.realtimeStreams.keys()).join(', ')}`);
    }

    // Fallback: Store message for later injection (when user sends next message)
    let userMessages = this.userMessages.get(message.userId);
    if (!userMessages) {
      userMessages = {
        userId: message.userId,
        pendingMessages: [],
        lastRetrieved: new Date()
      };
      this.userMessages.set(message.userId, userMessages);
    }

    userMessages.pendingMessages.push(message);
    devLogger('AsyncChatMessage', `📝 Message stored for later delivery to user ${message.userId}. Total pending: ${userMessages.pendingMessages.length}`);
  }

  /**
   * Get pending messages for a user and mark them as retrieved
   */
  getPendingMessages(userId: string): AsyncChatMessage[] {
    const userMessages = this.userMessages.get(userId);
    if (!userMessages || userMessages.pendingMessages.length === 0) {
      return [];
    }

    // Get all pending messages
    const messages = [...userMessages.pendingMessages];
    
    // Clear pending messages and update retrieval time
    userMessages.pendingMessages = [];
    userMessages.lastRetrieved = new Date();

    devLogger('AsyncChatMessage', `📬 Retrieved ${messages.length} pending messages for user ${userId}`);
    
    return messages;
  }

  /**
   * Convert async messages to CoreMessage format for chat injection
   */
  convertToCoreMessages(asyncMessages: AsyncChatMessage[]): CoreMessage[] {
    return asyncMessages.map(msg => ({
      role: 'assistant' as const,
      content: `🔔 **Notificación del sistema**\n\n${msg.message}`,
    }));
  }

  /**
   * Check if user has pending messages
   */
  hasPendingMessages(userId: string): boolean {
    const userMessages = this.userMessages.get(userId);
    return !!(userMessages && userMessages.pendingMessages.length > 0);
  }

  /**
   * Register a realtime stream callback for immediate message delivery
   */
  registerRealtimeStream(userId: string, callback: (message: AsyncChatMessage) => Promise<void>): void {
    const existingStream = this.realtimeStreams.has(userId);
    if (existingStream) {
      devLogger('AsyncChatMessage', `⚠️ Replacing existing realtime stream for user ${userId}`);
    }
    this.realtimeStreams.set(userId, callback);
    devLogger('AsyncChatMessage', `🔌 Realtime stream registered for user ${userId}${existingStream ? ' (replaced old stream)' : ''}`);
  }

  /**
   * Unregister a realtime stream callback
   */
  unregisterRealtimeStream(userId: string): void {
    this.realtimeStreams.delete(userId);
    devLogger('AsyncChatMessage', `🔌 Realtime stream unregistered for user ${userId}`);
  }

  /**
   * Check if user has active realtime stream
   */
  hasRealtimeStream(userId: string): boolean {
    return this.realtimeStreams.has(userId);
  }

  /**
   * Send file upload confirmation message
   */
  async sendFileUploadConfirmation(userId: string, fileName: string): Promise<void> {
    await this.sendMessageToUser({
      userId,
      message: `✅ **Archivo subido exitosamente**\n\n📄 He recibido tu documento: \`${fileName}\`\n\n🔍 Analizando contenido... Te notificaré cuando termine el análisis.`,
      type: 'file_upload_success',
      metadata: {
        fileName
      },
      timestamp: new Date()
    });
  }

  /**
   * Send transaction confirmation request
   */
  async sendTransactionConfirmationRequest(
    userId: string, 
    confirmationMessage: string, 
    processingLogId: string,
    transactionData: any
  ): Promise<void> {
    await this.sendMessageToUser({
      userId,
      message: confirmationMessage,
      type: 'confirmation_request',
      metadata: {
        processingLogId,
        transactionData,
        requiresConfirmation: true,
        confirmationTimeout: 24 * 60 * 60 * 1000 // 24 hours
      },
      timestamp: new Date()
    });
  }

  /**
   * Send transaction confirmation result
   */
  async sendTransactionConfirmationResult(
    userId: string,
    confirmed: boolean,
    resultMessage: string
  ): Promise<void> {
    await this.sendMessageToUser({
      userId,
      message: resultMessage,
      type: 'transaction_confirmed',
      metadata: {
        confirmed
      },
      timestamp: new Date()
    });
  }

  /**
   * Send error message
   */
  async sendErrorMessage(userId: string, error: string): Promise<void> {
    await this.sendMessageToUser({
      userId,
      message: `❌ **Error de procesamiento**\n\n${error}\n\nPor favor, intenta subir el documento nuevamente.`,
      type: 'error',
      timestamp: new Date()
    });
  }

}

export const asyncChatMessageService = new AsyncChatMessageService();