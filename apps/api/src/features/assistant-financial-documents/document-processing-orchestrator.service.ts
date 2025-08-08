import { devLogger } from "../../utils/logger.utils";
import { nanoid } from "../../providers/supabase/utils";
import { documentAnalyzerService } from "./document-analyzer.service";
import { financialTransactionClassifier } from "./financial-transaction-classifier.service";
import { documentClassificationLLMService } from "./document-classification-llm.service";
import { financialTransactionRepository } from "./financial-transaction.repository";
import { openAIVisionService } from "./openai-vision.service";
import { documentConverterService } from "./document-converter.service";
import { analysisMergerService } from "./analysis-merger.service";
import { documentTypeClassifierService } from "./document-type-classifier.service";
import { transactionConfirmationService } from "./transaction-confirmation.service";
import { supabase } from "../../providers/supabase";
import { documentProcessingLogs } from "../../providers/supabase/schema/document-processing-logs";
import { eq } from "drizzle-orm";

export interface DocumentProcessingRequest {
  bucketName: string;
  objectName: string;
  objectId: string;
  namespace: string;
  userId: string;
  documentType?: string;
  source?: 'whatsapp' | 'web' | 'api';
  eventTime?: string;
}

export interface DocumentProcessingResult {
  success: boolean;
  transactionId?: string;
  processingLogId: string;
  status: 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW_REQUIRED';
  confidence: number;
  extractedData?: any;
  classificationResult?: any;
  llmVerificationResult?: any;
  visionAnalysisResult?: any;
  error?: string;
  processingTime: number;
}

export class DocumentProcessingOrchestrator {

  /**
   * Main orchestration method that handles the full document processing pipeline
   */
  async processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    const documentId = nanoid();
    
    devLogger('DocumentProcessingOrchestrator', `🚀 Starting document processing pipeline - Document: ${documentId}, User: ${request.userId}, Object: ${request.objectName}`);

    // Create processing log entry
    const processingLog = await this.createProcessingLog(request, documentId);

    try {
      // Stage 0: Document Type Classification (Expense vs Income)
      devLogger('DocumentProcessingOrchestrator', '🎯 Starting document type classification (Expense vs Income)');
      
      const documentTypeResult = await documentTypeClassifierService.classifyDocumentType({
        bucketName: request.bucketName,
        objectName: request.objectName,
        namespace: request.namespace,
        userId: request.userId
      });

      const detectedTransactionType = documentTypeResult.documentType;
      devLogger('DocumentProcessingOrchestrator', `✅ Document classified as: ${detectedTransactionType} (confidence: ${documentTypeResult.confidence})`);

      // Update processing log with detected type
      await this.updateProcessingData(processingLog.id, {
        documentTypeClassification: documentTypeResult,
        detectedTransactionType
      });

      // Stage 1: OCR and Document Analysis
      await this.updateProcessingStatus(processingLog.id, 'PROCESSING_OCR', 'OCR_EXTRACTION');
      
      const ocrAnalysisResult = await documentAnalyzerService.analyzeDocument({
        bucketName: request.bucketName,
        objectName: request.objectName,
        objectId: request.objectId,
        namespace: request.namespace,
        userId: request.userId,
        config: {
          features: [
            { type: 'TEXT_DETECTION', maxResults: 100 },
            { type: 'KEY_VALUE_DETECTION', maxResults: 50 },
            { type: 'TABLE_EXTRACTION', maxResults: 20 },
            { type: 'DOCUMENT_CLASSIFICATION', maxResults: 10 }
          ],
          documentType: request.documentType as any,
          language: 'es',
          includeOutputLocation: true
        }
      });

      if (ocrAnalysisResult.status === 'failed' || !ocrAnalysisResult.extractedData) {
        throw new Error(`Document analysis failed: ${ocrAnalysisResult.error}`);
      }

      if (ocrAnalysisResult.status === 'processing') {
        // For async processing, we would handle this differently
        // For now, throw error as we expect immediate results
        throw new Error('Async document processing not implemented in orchestrator');
      }

      await this.updateProcessingData(processingLog.id, {
        extractedData: ocrAnalysisResult.extractedData,
        ocrConfidence: this.calculateOCRConfidence(ocrAnalysisResult.extractedData)
      });

      // Stage 2: OpenAI Vision Analysis (for enhanced Chilean document recognition)
      await this.updateProcessingStatus(processingLog.id, 'PROCESSING_VISION', 'VISION_ANALYSIS');
      
      let visionAnalysisResult = null;
      try {
        devLogger('DocumentProcessingOrchestrator', '👁️ Starting OpenAI Vision analysis for enhanced recognition');
        
        // Convert document to images if needed
        const conversionResult = await documentConverterService.convertToImages({
          bucketName: request.bucketName,
          objectName: request.objectName,
          namespace: request.namespace,
          userId: request.userId
        });

        if (conversionResult.success && conversionResult.imageData.length > 0) {
          // Log multi-page info
          if (conversionResult.imageData.length > 1) {
            devLogger('DocumentProcessingOrchestrator', `📄 Multi-page document detected: ${conversionResult.imageData.length} pages. Analyzing first page for efficiency.`);
          }
          
          // Analyze the first page (most important for financial documents)
          const firstImage = conversionResult.imageData[0];
          visionAnalysisResult = await openAIVisionService.analyzeDocumentImage({
            imageBase64: firstImage.base64,
            imageMimeType: firstImage.mimeType,
            bucketName: request.bucketName,
            objectName: request.objectName,
            namespace: request.namespace,
            userId: request.userId,
            documentType: request.documentType
          });

          await this.updateProcessingData(processingLog.id, {
            visionAnalysisResult,
            visionConfidence: visionAnalysisResult.confidence
          });

          devLogger('DocumentProcessingOrchestrator', `✅ Vision analysis completed - Merchant: ${visionAnalysisResult.merchantInfo?.merchantName}, Category: ${visionAnalysisResult.transactionInfo?.category}, Amount: ${visionAnalysisResult.transactionInfo?.amount}, Confidence: ${visionAnalysisResult.confidence}`);
        } else {
          devLogger('DocumentProcessingOrchestrator', '⚠️ Vision analysis skipped - will use enhanced text classification instead');
          
          // Fallback: Use OpenAI LLM to enhance classification with OCR results
          if (ocrAnalysisResult.status === 'completed' && ocrAnalysisResult.extractedData?.extractedText) {
            try {
              visionAnalysisResult = await this.enhanceClassificationWithLLM(
                ocrAnalysisResult.extractedData.extractedText,
                request
              );
              devLogger('DocumentProcessingOrchestrator', `✅ Enhanced LLM classification - Category: ${visionAnalysisResult.transactionInfo?.category}, Confidence: ${visionAnalysisResult.confidence}`);
            } catch (error) {
              devLogger('DocumentProcessingOrchestrator', `⚠️ Enhanced LLM classification failed: ${error}`);
            }
          }
        }
      } catch (error) {
        devLogger('DocumentProcessingOrchestrator', `⚠️ Vision analysis failed, continuing with OCR-only processing: ${error}`);
      }

      // Stage 3: Split Processing Flow Based on Document Type
      await this.updateProcessingStatus(processingLog.id, 'PROCESSING_CLASSIFICATION', 'TEXT_ANALYSIS');
      
      let classificationResult;
      
      if (detectedTransactionType === 'EXPENSE') {
        devLogger('DocumentProcessingOrchestrator', '💸 Processing EXPENSE document flow');
        classificationResult = await this.processExpenseDocument({
          text: ocrAnalysisResult.extractedData.text || '',
          amounts: ocrAnalysisResult.extractedData.financialData?.amounts || [],
          dates: ocrAnalysisResult.extractedData.financialData?.dates || [],
          merchant: ocrAnalysisResult.extractedData.financialData?.merchant,
          tables: ocrAnalysisResult.extractedData.tables,
          keyValuePairs: ocrAnalysisResult.extractedData.keyValues
        }, {
          documentType: ocrAnalysisResult.extractedData.documentClassification?.documentType || request.documentType,
          fileName: request.objectName,
          language: ocrAnalysisResult.extractedData.documentClassification?.language || 'es'
        });
      } else {
        devLogger('DocumentProcessingOrchestrator', '💰 Processing INCOME document flow');
        classificationResult = await this.processIncomeDocument({
          text: ocrAnalysisResult.extractedData.text || '',
          amounts: ocrAnalysisResult.extractedData.financialData?.amounts || [],
          dates: ocrAnalysisResult.extractedData.financialData?.dates || [],
          merchant: ocrAnalysisResult.extractedData.financialData?.merchant,
          tables: ocrAnalysisResult.extractedData.tables,
          keyValuePairs: ocrAnalysisResult.extractedData.keyValues
        }, {
          documentType: ocrAnalysisResult.extractedData.documentClassification?.documentType || request.documentType,
          fileName: request.objectName,
          language: ocrAnalysisResult.extractedData.documentClassification?.language || 'es'
        });
      }

      await this.updateProcessingData(processingLog.id, {
        classificationConfidence: classificationResult.confidence
      });

      // Stage 3: LLM Verification
      await this.updateProcessingStatus(processingLog.id, 'PROCESSING_LLM_VERIFICATION', 'LLM_VERIFICATION');
      
      const llmResult = await documentClassificationLLMService.verifyClassification(
        {
          text: ocrAnalysisResult.extractedData.text || '',
          amounts: ocrAnalysisResult.extractedData.financialData?.amounts || [],
          dates: ocrAnalysisResult.extractedData.financialData?.dates || [],
          merchant: ocrAnalysisResult.extractedData.financialData?.merchant,
          tables: ocrAnalysisResult.extractedData.tables,
          keyValuePairs: ocrAnalysisResult.extractedData.keyValues
        },
        {
          documentType: ocrAnalysisResult.extractedData.documentClassification?.documentType || request.documentType,
          fileName: request.objectName,
          language: 'es'
        },
        classificationResult,
        { chileanContext: true }
      );

      // Merge all analysis results using the specialized merger service
      const mergedAnalysisResult = analysisMergerService.mergeAnalysisResults(
        classificationResult,
        llmResult, 
        visionAnalysisResult
      );
      
      const finalResult = mergedAnalysisResult.finalResult;
      const finalConfidence = mergedAnalysisResult.finalConfidence;

      await this.updateProcessingData(processingLog.id, {
        llmConfidence: llmResult.confidence,
        overallConfidence: finalConfidence,
        llmResponse: llmResult,
        analysisResult: {
          sourcesUsed: mergedAnalysisResult.sourcesUsed,
          discrepancies: mergedAnalysisResult.discrepancies,
          reasoning: mergedAnalysisResult.reasoning
        }
      });

      // Stage 4: Request User Confirmation (instead of storing directly)
      await this.updateProcessingStatus(processingLog.id, 'PENDING_CONFIRMATION', 'USER_CONFIRMATION');
      
      let processingStatus: 'COMPLETED' | 'MANUAL_REVIEW_REQUIRED' = 'COMPLETED';

      devLogger('DocumentProcessingOrchestrator', `🔔 Requesting user confirmation for transaction with confidence: ${finalConfidence}`);

      // Request user confirmation instead of storing directly
      await transactionConfirmationService.requestUserConfirmation({
        processingLogId: processingLog.id,
        userId: request.userId,
        transactionDetails: {
          transactionType: finalResult.transactionType,
          category: finalResult.category,
          subcategory: finalResult.subcategory,
          amount: finalResult.amount,
          currency: finalResult.currency || 'CLP',
          transactionDate: new Date(finalResult.transactionDate),
          description: finalResult.description,
          merchant: finalResult.merchant,
          confidence: finalConfidence
        },
        analysisContext: {
          documentId: documentId,
          extractedData: ocrAnalysisResult.extractedData,
          classificationResult,
          llmVerificationResult: llmResult,
          visionAnalysisResult,
          processingTime: Date.now() - startTime
        },
        uploadJobData: request
      });

      // Final stage: Mark as pending confirmation
      const processingTime = Date.now() - startTime;
      await this.updateProcessingStatus(
        processingLog.id, 
        'PENDING_CONFIRMATION',
        'USER_CONFIRMATION',
        processingTime
      );

      const result: DocumentProcessingResult = {
        success: true,
        transactionId: undefined, // No transaction ID yet - waiting for confirmation
        processingLogId: processingLog.id,
        status: 'COMPLETED', // Processing is completed, now waiting for user confirmation
        confidence: finalConfidence,
        extractedData: ocrAnalysisResult.extractedData,
        classificationResult,
        llmVerificationResult: llmResult,
        visionAnalysisResult,
        processingTime
      };

      devLogger('DocumentProcessingOrchestrator', `✅ Document processing completed successfully - Awaiting user confirmation, Confidence: ${finalConfidence}, Sources: ${mergedAnalysisResult.sourcesUsed.join(', ')}, Discrepancies: ${mergedAnalysisResult.discrepancies.length}, Processing: ${processingTime}ms`);

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      devLogger('DocumentProcessingOrchestrator', `❌ Document processing failed - Document: ${documentId}, Error: ${errorMessage}, Processing: ${processingTime}ms`);

      // Update processing log with error
      await this.updateProcessingStatus(processingLog.id, 'FAILED', 'FINAL_VALIDATION', processingTime, errorMessage);

      return {
        success: false,
        processingLogId: processingLog.id,
        status: 'FAILED',
        confidence: 0,
        error: errorMessage,
        processingTime
      };
    }
  }

  /**
   * Create initial processing log entry
   */
  private async createProcessingLog(request: DocumentProcessingRequest, documentId: string) {
    const [processingLog] = await supabase
      .insert(documentProcessingLogs)
      .values({
        documentId,
        userId: request.userId,
        bucketName: request.bucketName,
        objectName: request.objectName,
        namespace: request.namespace,
        status: 'QUEUED',
        currentStage: 'DOCUMENT_UPLOAD',
        documentType: request.documentType,
        detectedLanguage: 'es',
        queuedAt: new Date(),
        startedAt: new Date()
      })
      .returning();

    return processingLog;
  }

  /**
   * Update processing status and stage
   */
  private async updateProcessingStatus(
    processingLogId: string,
    status: any,
    stage: any,
    processingTime?: number,
    error?: string
  ) {
    const updates: any = {
      status,
      currentStage: stage,
      updatedAt: new Date()
    };

    if (processingTime) {
      updates.totalProcessingTime = processingTime;
    }

    if (status === 'COMPLETED') {
      updates.completedAt = new Date();
    } else if (status === 'FAILED') {
      updates.failedAt = new Date();
      if (error) {
        updates.errors = [{ stage, error, timestamp: new Date().toISOString() }];
      }
    }

    await supabase
      .update(documentProcessingLogs)
      .set(updates)
      .where(eq(documentProcessingLogs.id, processingLogId));
  }

  /**
   * Update processing data (extracted data, confidence scores, etc.)
   */
  private async updateProcessingData(processingLogId: string, data: any) {
    await supabase
      .update(documentProcessingLogs)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(documentProcessingLogs.id, processingLogId));
  }

  /**
   * Calculate OCR confidence from extracted data
   */
  private calculateOCRConfidence(extractedData: any): number {
    // This is a placeholder - in real implementation, you would calculate
    // based on OCR word-level confidence scores
    if (!extractedData.text) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Add confidence based on text length and structure
    if (extractedData.text.length > 100) confidence += 0.2;
    if (extractedData.financialData?.amounts?.length > 0) confidence += 0.1;
    if (extractedData.financialData?.dates?.length > 0) confidence += 0.1;
    if (extractedData.keyValues?.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Enhanced classification using OpenAI LLM when vision analysis fails
   */
  private async enhanceClassificationWithLLM(extractedText: string, request: DocumentProcessingRequest) {
    const { generateObject } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');
    const { z } = await import('zod');

    // Use the same schema as vision analysis for consistency
    const LLMClassificationSchema = z.object({
      extractedText: z.string(),
      merchantInfo: z.object({
        merchantName: z.string(),
        confidence: z.number().min(0).max(1)
      }),
      transactionInfo: z.object({
        transactionType: z.enum(['INCOME', 'EXPENSE']),
        category: z.string(),
        amount: z.number(),
        currency: z.string().default('CLP'),
        description: z.string(),
        confidence: z.number().min(0).max(1)
      }),
      confidence: z.number().min(0).max(1)
    });

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: `Analiza este texto extraído de un documento financiero chileno y clasifica la transacción:

TEXTO EXTRAÍDO:
${extractedText.substring(0, 2000)} // Limit text length

INSTRUCCIONES:
1. Identifica el comercio/merchant exactamente
2. Determina si es INGRESO o GASTO
3. Clasifica en categorías específicas como: electronica, alimentacion, transporte, salud, etc.
4. Encuentra el monto principal de la transacción
5. Usa contexto chileno (nombres de tiendas, RUT, etc.)

CATEGORÍAS ESPECÍFICAS:
- electronica (PC Factory, Wei, computadores, celulares, tarjetas SD)
- alimentacion (supermercados, restaurantes)
- transporte (combustible, Uber, transporte público)
- salud (farmacias, clínicas)
- vestimenta (ropa, calzado)
- hogar (muebles, electrodomésticos)
- servicios_basicos (luz, agua, gas, internet)
- entretenimiento (cine, streaming)
- educacion (libros, cursos)
- servicios_financieros (bancos, seguros)

Responde con máxima precisión para el contexto chileno.`
        }
      ],
      schema: LLMClassificationSchema,
      temperature: 0.1
    });

    // Convert to VisionAnalysisResult format
    return {
      success: true,
      extractedText: result.object.extractedText,
      amounts: [result.object.transactionInfo.amount],
      dates: [],
      merchantInfo: {
        merchantName: result.object.merchantInfo.merchantName,
        confidence: result.object.merchantInfo.confidence
      },
      transactionInfo: result.object.transactionInfo,
      chileanContext: {
        documentType: 'UNKNOWN' as const,
        isChileanDocument: true,
        language: 'es' as const,
        hasRUT: extractedText.includes('-'),
        hasIVA: extractedText.toLowerCase().includes('iva')
      },
      confidence: result.object.confidence,
      processingTime: 0
    };
  }

  /**
   * Specialized processing for EXPENSE documents
   */
  private async processExpenseDocument(extractedData: any, context: any) {
    devLogger('DocumentProcessingOrchestrator', '💸 Using expense-specific classification logic');
    
    // Force transaction type to EXPENSE and use standard classification
    const classificationResult = await financialTransactionClassifier.classifyTransaction(
      extractedData,
      context
    );

    // Ensure it's marked as expense
    return {
      ...classificationResult,
      transactionType: 'EXPENSE' as const
    };
  }

  /**
   * Specialized processing for INCOME documents
   */
  private async processIncomeDocument(extractedData: any, context: any) {
    devLogger('DocumentProcessingOrchestrator', '💰 Using income-specific classification logic');
    
    // For income documents, use different category mapping
    const incomeCategories = this.getIncomeCategories(extractedData.text);
    
    // Extract amount (for income, usually the main amount)
    const amounts = extractedData.amounts || [];
    const primaryAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

    return {
      transactionType: 'INCOME' as const,
      category: incomeCategories.category,
      subcategory: incomeCategories.subcategory,
      amount: primaryAmount,
      currency: 'CLP',
      confidence: incomeCategories.confidence,
      reasoning: `Income document processed: ${incomeCategories.reasoning}`
    };
  }

  /**
   * Get income-specific categories
   */
  private getIncomeCategories(text: string) {
    const lowerText = text.toLowerCase();

    // Salary/wage patterns
    if (lowerText.includes('liquidacion') || lowerText.includes('sueldo') || lowerText.includes('salario') || lowerText.includes('remuneracion')) {
      return {
        category: 'salario',
        subcategory: 'sueldo_liquido',
        confidence: 0.95,
        reasoning: 'Liquidación de sueldo detected'
      };
    }

    // Business/professional income
    if (lowerText.includes('factura') || lowerText.includes('honorarios') || lowerText.includes('servicios prestados')) {
      return {
        category: 'ingresos_profesionales', 
        subcategory: 'honorarios',
        confidence: 0.90,
        reasoning: 'Professional services income detected'
      };
    }

    // Transfer received
    if (lowerText.includes('transferencia recibida') || lowerText.includes('deposito') || lowerText.includes('abono')) {
      return {
        category: 'transferencias',
        subcategory: 'transferencia_recibida',
        confidence: 0.85,
        reasoning: 'Transfer received detected'
      };
    }

    // Sales income
    if (lowerText.includes('venta') || lowerText.includes('ingreso por venta')) {
      return {
        category: 'ventas',
        subcategory: 'venta_productos',
        confidence: 0.80,
        reasoning: 'Sales income detected'
      };
    }

    // Default income category
    return {
      category: 'otros_ingresos',
      subcategory: 'ingresos_varios',
      confidence: 0.60,
      reasoning: 'General income document'
    };
  }

}

export const documentProcessingOrchestrator = new DocumentProcessingOrchestrator();