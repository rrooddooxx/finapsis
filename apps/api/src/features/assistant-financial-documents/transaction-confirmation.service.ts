import { devLogger } from "../../utils/logger.utils";
import { financialTransactionRepository } from "./financial-transaction.repository";
import { queueService } from "../../workers/services/queue.service";
import { DocumentConfirmationJobData, TransactionConfirmationResponseJobData } from "../../workers/jobs/document-processing.jobs";

export interface ConfirmationRequestData {
  processingLogId: string;
  userId: string;
  transactionDetails: {
    transactionType: 'INCOME' | 'EXPENSE';
    category: string;
    subcategory?: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    description: string;
    merchant?: string;
    confidence: number;
  };
  analysisContext: {
    documentId: string;
    extractedData: any;
    classificationResult: any;
    llmVerificationResult?: any;
    visionAnalysisResult?: any;
    processingTime: number;
  };
  uploadJobData: any;
}

export interface ConfirmationResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  error?: string;
}

export class TransactionConfirmationService {
  
  /**
   * Request user confirmation for a transaction
   * This adds a job to the confirmation queue which will send a message to the chat
   */
  async requestUserConfirmation(data: ConfirmationRequestData): Promise<void> {
    devLogger('TransactionConfirmationService', `🔔 Requesting user confirmation for transaction - User: ${data.userId}, Amount: ${data.transactionDetails.currency} ${data.transactionDetails.amount}`);

    const confirmationJobData: DocumentConfirmationJobData = {
      processingLogId: data.processingLogId,
      userId: data.userId,
      transactionDetails: data.transactionDetails,
      analysisContext: data.analysisContext,
      uploadJobData: data.uploadJobData,
      expiryTime: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Expire after 24 hours
      retryCount: 0
    };

    await queueService.addDocumentConfirmationJob(confirmationJobData);
    
    devLogger('TransactionConfirmationService', `✅ Confirmation request queued successfully`);
  }

  /**
   * Process user confirmation response (when user says "si" or "no")
   */
  async processConfirmationResponse(
    confirmationJobId: string,
    processingLogId: string, 
    userId: string,
    confirmed: boolean,
    userMessage?: string
  ): Promise<ConfirmationResponse> {
    
    devLogger('TransactionConfirmationService', `📝 Processing confirmation response - User: ${userId}, Confirmed: ${confirmed}, Job: ${confirmationJobId}`);

    try {
      // Create response job data
      const responseJobData: TransactionConfirmationResponseJobData = {
        confirmationJobId,
        processingLogId,
        userId,
        confirmed,
        userMessage
      };

      // Queue the response processing
      await queueService.addTransactionConfirmationResponseJob(responseJobData);

      if (confirmed) {
        return {
          success: true,
          message: "✅ Transacción confirmada. Se está procesando para guardarla en tu historial financiero."
        };
      } else {
        return {
          success: true,
          message: "❌ Transacción cancelada. No se guardará en tu historial financiero."
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devLogger('TransactionConfirmationService', `❌ Error processing confirmation response: ${errorMessage}`);
      
      return {
        success: false,
        message: "⚠️ Error al procesar tu respuesta. Intenta de nuevo.",
        error: errorMessage
      };
    }
  }

  /**
   * Execute the actual transaction storage (called by worker after user confirms)
   */
  async storeConfirmedTransaction(
    transactionData: {
      documentId: string;
      transactionType: 'INCOME' | 'EXPENSE';
      category: string;
      subcategory?: string;
      amount: number;
      currency: string;
      transactionDate: Date;
      description: string;
      merchant?: string;
      confidence: number;
      metadata?: Record<string, any>;
    },
    userId: string
  ): Promise<ConfirmationResponse> {
    
    devLogger('TransactionConfirmationService', `💾 Storing confirmed transaction - User ID: ${userId}, Amount: ${transactionData.currency} ${transactionData.amount}`);
    devLogger('TransactionConfirmationService', `🔍 User ID type: ${typeof userId}, Length: ${userId.length}, Is UUID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)}`);

    try {
      const transaction = await financialTransactionRepository.create({
        userId: userId,
        documentId: transactionData.documentId,
        transactionType: transactionData.transactionType,
        category: transactionData.category,
        subcategory: transactionData.subcategory,
        amount: transactionData.amount.toString(),
        currency: transactionData.currency || 'CLP',
        transactionDate: transactionData.transactionDate,
        description: transactionData.description,
        merchant: transactionData.merchant,
        confidenceScore: transactionData.confidence.toString(),
        status: 'VERIFIED', // User confirmed, so mark as verified
        processingMethod: 'USER_CONFIRMED',
        metadata: {
          ...transactionData.metadata,
          userConfirmed: true,
          confirmedAt: new Date().toISOString()
        }
      });

      devLogger('TransactionConfirmationService', `✅ Transaction stored successfully - Transaction ID: ${transaction.id}`);

      return {
        success: true,
        transactionId: transaction.id,
        message: `✅ Transacción guardada correctamente en tu historial financiero.\n\n📊 **Resumen:**\n- Tipo: ${transactionData.transactionType === 'EXPENSE' ? 'Gasto' : 'Ingreso'}\n- Categoría: ${transactionData.category}\n- Monto: ${transactionData.currency} ${transactionData.amount.toLocaleString('es-CL')}\n- Comercio: ${transactionData.merchant || 'No especificado'}\n- Fecha: ${typeof transactionData.transactionDate === 'string' ? new Date(transactionData.transactionDate).toLocaleDateString('es-CL') : transactionData.transactionDate.toLocaleDateString('es-CL')}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devLogger('TransactionConfirmationService', `❌ Error storing confirmed transaction: ${errorMessage}`);
      
      return {
        success: false,
        message: "❌ Error al guardar la transacción. Intenta subir el documento nuevamente.",
        error: errorMessage
      };
    }
  }

  /**
   * Generate a formatted confirmation message for the user
   */
  generateConfirmationMessage(transactionDetails: ConfirmationRequestData['transactionDetails']): string {
    const transactionTypeText = transactionDetails.transactionType === 'EXPENSE' ? '💸 Gasto' : '💰 Ingreso';
    const amountFormatted = `${transactionDetails.currency} ${transactionDetails.amount.toLocaleString('es-CL')}`;
    
    // Handle date formatting - transactionDate might be a string or Date object
    let dateFormatted: string;
    try {
      const date = typeof transactionDetails.transactionDate === 'string' 
        ? new Date(transactionDetails.transactionDate) 
        : transactionDetails.transactionDate;
      
      dateFormatted = date.toLocaleDateString('es-CL');
    } catch (error) {
      devLogger('TransactionConfirmationService', `⚠️ Error formatting date: ${error}. Using raw value.`);
      dateFormatted = String(transactionDetails.transactionDate);
    }
    
    const confidencePercent = Math.round(transactionDetails.confidence * 100);

    return `📄 **He analizado tu documento financiero:**

${transactionTypeText}
• **Categoría:** ${transactionDetails.category}${transactionDetails.subcategory ? ` (${transactionDetails.subcategory})` : ''}
• **Monto:** ${amountFormatted}
• **Comercio:** ${transactionDetails.merchant || 'No identificado'}
• **Fecha:** ${dateFormatted}
• **Descripción:** ${transactionDetails.description}
• **Confianza:** ${confidencePercent}%

¿Confirmas esta transacción para guardarla en tu historial financiero?

**Responde "si" para confirmar o "no" para cancelar.**`;
  }

  /**
   * Check if a message contains confirmation keywords
   */
  isConfirmationMessage(message: string): { isConfirmation: boolean; confirmed?: boolean } {
    const lowerMessage = message.toLowerCase().trim();
    
    // Positive confirmation keywords
    const yesKeywords = ['si', 'sí', 'yes', 'confirmar', 'confirmo', 'ok', 'vale', 'correcto', 'exacto'];
    // Negative confirmation keywords  
    const noKeywords = ['no', 'nope', 'cancelar', 'cancelo', 'incorrecto', 'mal', 'error'];

    const isYes = yesKeywords.some(keyword => lowerMessage === keyword || lowerMessage.includes(keyword));
    const isNo = noKeywords.some(keyword => lowerMessage === keyword || lowerMessage.includes(keyword));

    if (isYes && !isNo) {
      return { isConfirmation: true, confirmed: true };
    } else if (isNo && !isYes) {
      return { isConfirmation: true, confirmed: false };
    }

    return { isConfirmation: false };
  }
}

export const transactionConfirmationService = new TransactionConfirmationService();