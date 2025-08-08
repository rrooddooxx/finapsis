import { tool } from 'ai';
import { z } from 'zod';
import { transactionConfirmationService } from '../../assistant-financial-documents/transaction-confirmation.service';
import { devLogger } from '../../../utils/logger.utils';
import { pendingConfirmationsStore } from '../../assistant-financial-documents/pending-confirmations.store';

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

    // Try to get pending confirmation from store if IDs are missing
    let actualConfirmationJobId = confirmationJobId;
    let actualProcessingLogId = processingLogId;
    let transactionData = null;
    
    if (!actualConfirmationJobId || !actualProcessingLogId) {
      devLogger('ConfirmTransaction', '⚠️ Missing confirmation job ID or processing log ID - checking pending confirmations store');
      
      const pendingConfirmation = pendingConfirmationsStore.getPendingConfirmation(userId);
      if (pendingConfirmation) {
        devLogger('ConfirmTransaction', `✅ Found pending confirmation in store: ${pendingConfirmation.processingLogId}`);
        actualProcessingLogId = pendingConfirmation.processingLogId;
        
        // Transform the stored transaction data to match the format expected by the worker
        const storedData = pendingConfirmation.transactionData;
        if (storedData) {
          transactionData = {
            documentId: actualProcessingLogId, // Use processing log ID as document ID
            transactionType: storedData.transactionType,
            category: storedData.category,
            subcategory: storedData.subcategory,
            amount: storedData.amount,
            currency: storedData.currency || 'CLP',
            transactionDate: new Date(storedData.transactionDate),
            description: storedData.description,
            merchant: storedData.merchant,
            confidence: storedData.confidence,
            metadata: {
              processingLogId: actualProcessingLogId,
              confirmedVia: 'chat',
              originalData: storedData
            }
          };
        }
        
        // Generate a confirmation job ID for processing
        actualConfirmationJobId = `conf-${actualProcessingLogId}-${Date.now()}`;
      } else {
        devLogger('ConfirmTransaction', '❌ No pending confirmation found in store');
        return {
          success: false,
          isConfirmation: true,
          confirmed: confirmationCheck.confirmed,
          message: 'No encontré una transacción pendiente de confirmación. Es posible que haya expirado.',
          requiresProcessing: false
        };
      }
    }

    // Process the confirmation response
    devLogger('ConfirmTransaction', `🔍 About to process confirmation with userId: ${userId}, type: ${typeof userId}, length: ${userId.length}`);
    devLogger('ConfirmTransaction', `🔍 Transaction data userId context: ${JSON.stringify({userId, actualProcessingLogId, confirmed: confirmationCheck.confirmed})}`);
    
    const result = await transactionConfirmationService.processConfirmationResponse(
      actualConfirmationJobId,
      actualProcessingLogId,
      userId,
      confirmationCheck.confirmed!,
      userMessage,
      transactionData
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
  description: 'Process user confirmation responses for financial transactions. Detects when user says "si", "no", or similar confirmation keywords and processes the response accordingly. Automatically retrieves pending confirmation context from the store.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID who is confirming/rejecting the transaction'),
    userMessage: z.string().describe('The user message that potentially contains confirmation (si/no)'),
    confirmationJobId: z.string().optional().describe('The confirmation job ID (if available - otherwise will be retrieved from pending confirmations store)'),
    processingLogId: z.string().optional().describe('The processing log ID (if available - otherwise will be retrieved from pending confirmations store)')
  }),
  execute: confirmTransactionAction
});