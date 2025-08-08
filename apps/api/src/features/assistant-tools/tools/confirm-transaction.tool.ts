import { tool } from 'ai';
import { z } from 'zod';
import { transactionConfirmationService } from '../../assistant-financial-documents/transaction-confirmation.service';
import { devLogger } from '../../../utils/logger.utils';

const confirmTransactionAction = async (params: {
  userId: string;
  userMessage: string;
  confirmationJobId?: string;
  processingLogId?: string;
}) => {
  const { userId, userMessage, confirmationJobId, processingLogId } = params;

  try {
    devLogger('ConfirmTransaction', `🔍 Processing potential confirmation message from user: ${userId}`);
    devLogger('ConfirmTransaction', `Message: "${userMessage}"`);

    // Check if the message contains confirmation keywords
    const confirmationCheck = transactionConfirmationService.isConfirmationMessage(userMessage);
    
    if (!confirmationCheck.isConfirmation) {
      return {
        success: false,
        isConfirmation: false,
        message: 'Mensaje no es una confirmación de transacción.'
      };
    }

    // For now, we'll need to handle confirmation processing differently
    // since we might not have the exact job IDs in the chat context
    // This is a simplified version that assumes the user is responding to the most recent confirmation request
    
    if (!confirmationJobId || !processingLogId) {
      devLogger('ConfirmTransaction', '⚠️ Missing confirmation job ID or processing log ID - this is normal in chat flow');
      
      // In the actual implementation, we might need to track pending confirmations
      // in a separate storage or derive them from the chat context
      return {
        success: true,
        isConfirmation: true,
        confirmed: confirmationCheck.confirmed,
        message: confirmationCheck.confirmed 
          ? '✅ Confirmación recibida. Procesando tu transacción...' 
          : '❌ Transacción cancelada como solicitaste.',
        requiresProcessing: true
      };
    }

    // Process the confirmation response
    const result = await transactionConfirmationService.processConfirmationResponse(
      confirmationJobId,
      processingLogId,
      userId,
      confirmationCheck.confirmed!,
      userMessage
    );

    return {
      success: result.success,
      isConfirmation: true,
      confirmed: confirmationCheck.confirmed,
      message: result.message,
      error: result.error,
      transactionId: result.transactionId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    devLogger('ConfirmTransaction', `❌ Error processing confirmation: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      message: 'Error al procesar tu confirmación. Intenta de nuevo.'
    };
  }
};

export const confirmTransactionTool = tool({
  description: 'Process user confirmation responses for financial transactions. Detects when user says "si", "no", or similar confirmation keywords and processes the response accordingly.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID who is confirming/rejecting the transaction'),
    userMessage: z.string().describe('The user message that potentially contains confirmation (si/no)'),
    confirmationJobId: z.string().optional().describe('The confirmation job ID (if available)'),
    processingLogId: z.string().optional().describe('The processing log ID (if available)')
  }),
  execute: confirmTransactionAction
});