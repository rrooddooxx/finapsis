import { devLogger } from "../../utils/logger.utils";
import { nanoid } from "../../providers/supabase/utils";
import { documentAnalyzerService } from "./document-analyzer.service";
import { financialTransactionClassifier } from "./financial-transaction-classifier.service";
import { documentClassificationLLMService } from "./document-classification-llm.service";
import { financialTransactionRepository } from "./financial-transaction.repository";
import { openAIVisionService } from "./openai-vision.service";
import { documentConverterService } from "./document-converter.service";
import { analysisMergerService } from "./analysis-merger.service";
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
          devLogger('DocumentProcessingOrchestrator', '⚠️ Vision analysis skipped - conversion failed or unsupported format');
        }
      } catch (error) {
        devLogger('DocumentProcessingOrchestrator', `⚠️ Vision analysis failed, continuing with OCR-only processing: ${error}`);
      }

      // Stage 3: Financial Classification
      await this.updateProcessingStatus(processingLog.id, 'PROCESSING_CLASSIFICATION', 'TEXT_ANALYSIS');
      
      const classificationResult = await financialTransactionClassifier.classifyTransaction(
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
          language: ocrAnalysisResult.extractedData.documentClassification?.language || 'es'
        }
      );

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

      // Stage 4: Store Financial Transaction
      await this.updateProcessingStatus(processingLog.id, 'PROCESSING_CLASSIFICATION', 'TRANSACTION_CREATION');
      
      let transactionId: string | undefined;
      let processingStatus: 'COMPLETED' | 'MANUAL_REVIEW_REQUIRED' = 'COMPLETED';

      // Store all transactions regardless of confidence (user requested no manual review)
      devLogger('DocumentProcessingOrchestrator', `💾 Storing transaction with confidence: ${finalConfidence}`);

      // Always process and store the transaction
      const transaction = await financialTransactionRepository.create({
        userId: request.userId,
        documentId: documentId,
        transactionType: finalResult.transactionType,
        category: finalResult.category,
        subcategory: finalResult.subcategory,
        amount: finalResult.amount.toString(),
        currency: finalResult.currency || 'CLP',
        transactionDate: new Date(finalResult.transactionDate),
        description: finalResult.description,
        merchant: finalResult.merchant,
        confidenceScore: finalConfidence.toString(),
        status: finalConfidence > 0.8 ? 'VERIFIED' : 'CLASSIFIED',
        processingMethod: 'HYBRID',
        metadata: {
          documentType: request.documentType,
          source: request.source,
          ocrConfidence: ocrAnalysisResult.extractedData ? this.calculateOCRConfidence(ocrAnalysisResult.extractedData) : 0,
          classificationConfidence: classificationResult.confidence,
          llmConfidence: llmResult.confidence,
          hasDiscrepancies: mergedAnalysisResult.discrepancies.length > 0,
          discrepancies: mergedAnalysisResult.discrepancies,
          extractedAmounts: ocrAnalysisResult.extractedData?.financialData?.amounts || [],
          extractedDates: ocrAnalysisResult.extractedData?.financialData?.dates || []
        }
      });

      transactionId = transaction.id;
      
      // Update processing log with transaction ID
      await this.updateProcessingData(processingLog.id, { transactionId });

      // Final stage: Mark as completed
      const processingTime = Date.now() - startTime;
      await this.updateProcessingStatus(
        processingLog.id, 
        'COMPLETED', // Always mark as completed since we store all transactions
        'FINAL_VALIDATION',
        processingTime
      );

      const result: DocumentProcessingResult = {
        success: true,
        transactionId,
        processingLogId: processingLog.id,
        status: 'COMPLETED', // Always completed since we store all transactions
        confidence: finalConfidence,
        extractedData: ocrAnalysisResult.extractedData,
        classificationResult,
        llmVerificationResult: llmResult,
        visionAnalysisResult,
        processingTime
      };

      devLogger('DocumentProcessingOrchestrator', `✅ Document processing completed successfully - Transaction: ${transactionId}, Confidence: ${finalConfidence}, Sources: ${mergedAnalysisResult.sourcesUsed.join(', ')}, Discrepancies: ${mergedAnalysisResult.discrepancies.length}, Processing: ${processingTime}ms`);

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

}

export const documentProcessingOrchestrator = new DocumentProcessingOrchestrator();