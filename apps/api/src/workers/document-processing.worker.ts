import {ConnectionOptions, Job, Worker} from 'bullmq';
import {devLogger} from '../utils/logger.utils';
import {
    documentAnalyzerService
} from '../features/assistant-financial-documents/document-analyzer.service';
import { documentProcessingOrchestrator } from '../features/assistant-financial-documents/document-processing-orchestrator.service';
import { documentClassificationLLMService } from '../features/assistant-financial-documents/document-classification-llm.service';
import { transactionConfirmationService } from '../features/assistant-financial-documents/transaction-confirmation.service';
import { asyncChatMessageService } from '../features/assistant-chatbot/async-chat-message.service';
import {queueService} from './services/queue.service';
import {
    DocumentAnalysisJobData,
    DocumentProcessingCompletedJobData,
    DocumentUploadJobData,
    DocumentConfirmationJobData,
    TransactionConfirmationResponseJobData,
    JOB_QUEUES,
} from './jobs/document-processing.jobs';

export class DocumentProcessingWorker {
    private uploadWorker!: Worker<DocumentUploadJobData>;
    private analysisWorker!: Worker<DocumentAnalysisJobData>;
    private completedWorker!: Worker<DocumentProcessingCompletedJobData>;
    private confirmationWorker!: Worker<DocumentConfirmationJobData>;
    private confirmationResponseWorker!: Worker<TransactionConfirmationResponseJobData>;
    private readonly connection: ConnectionOptions;

    constructor() {
        this.connection = {
            host: Bun.env.REDIS_HOST || 'localhost',
            port: parseInt(Bun.env.REDIS_PORT || '6379'),
            password: Bun.env.REDIS_PASSWORD,
            db: parseInt(Bun.env.REDIS_DB || '0'),
        };

        this.setupWorkers();
    }

    // Graceful shutdown
    async shutdown() {
        devLogger('Document Worker', '🔨 Shutting down document processing workers...');

        await this.uploadWorker.close();
        await this.analysisWorker.close();
        await this.completedWorker.close();
        await this.confirmationWorker.close();
        await this.confirmationResponseWorker.close();

        devLogger('Document Worker', '🔨 Document processing workers shut down');
    }

    private setupWorkers() {
        // Document Upload Worker - Processes new document uploads
        this.uploadWorker = new Worker<DocumentUploadJobData>(
            JOB_QUEUES.DOCUMENT_UPLOAD,
            this.processDocumentUpload.bind(this),
            {
                connection: this.connection,
                concurrency: 5, // Process up to 5 uploads concurrently
            }
        );

        // Document Analysis Worker - Checks analysis status and retries
        this.analysisWorker = new Worker<DocumentAnalysisJobData>(
            JOB_QUEUES.DOCUMENT_ANALYSIS,
            this.checkAnalysisStatus.bind(this),
            {
                connection: this.connection,
                concurrency: 3, // Process up to 3 analysis checks concurrently
            }
        );

        // Document Completed Worker - Handles completed analysis (notifications, etc.)
        this.completedWorker = new Worker<DocumentProcessingCompletedJobData>(
            JOB_QUEUES.DOCUMENT_COMPLETED,
            this.handleCompletedAnalysis.bind(this),
            {
                connection: this.connection,
                concurrency: 10, // Process up to 10 completions concurrently
            }
        );

        // Document Confirmation Worker - Sends confirmation messages to chat
        this.confirmationWorker = new Worker<DocumentConfirmationJobData>(
            JOB_QUEUES.DOCUMENT_CONFIRMATION,
            this.handleConfirmationRequest.bind(this),
            {
                connection: this.connection,
                concurrency: 5, // Process up to 5 confirmations concurrently
            }
        );

        // Transaction Confirmation Response Worker - Processes user confirmations
        this.confirmationResponseWorker = new Worker<TransactionConfirmationResponseJobData>(
            JOB_QUEUES.TRANSACTION_CONFIRMATION_RESPONSE,
            this.handleConfirmationResponse.bind(this),
            {
                connection: this.connection,
                concurrency: 3, // Process up to 3 responses concurrently
            }
        );

        this.setupEventHandlers();
        devLogger('Document Worker', '🔨 Document processing workers initialized');
    }

    private setupEventHandlers() {
        // Upload Worker Events
        this.uploadWorker.on('completed', (job) => {
            devLogger('Upload Worker', `✅ Job ${job.id} completed successfully`);
        });

        this.uploadWorker.on('failed', (job, err) => {
            devLogger('Upload Worker', `❌ Job ${job?.id} failed: ${err.message}`);
        });

        // Analysis Worker Events
        this.analysisWorker.on('completed', (job) => {
            devLogger('Analysis Worker', `✅ Job ${job.id} completed successfully`);
        });

        this.analysisWorker.on('failed', (job, err) => {
            devLogger('Analysis Worker', `❌ Job ${job?.id} failed: ${err.message}`);
        });

        // Completed Worker Events
        this.completedWorker.on('completed', (job) => {
            devLogger('Completed Worker', `✅ Job ${job.id} completed successfully`);
        });

        this.completedWorker.on('failed', (job, err) => {
            devLogger('Completed Worker', `❌ Job ${job?.id} failed: ${err.message}`);
        });

        // Confirmation Worker Events
        this.confirmationWorker.on('completed', (job) => {
            devLogger('Confirmation Worker', `✅ Job ${job.id} completed successfully`);
        });

        this.confirmationWorker.on('failed', (job, err) => {
            devLogger('Confirmation Worker', `❌ Job ${job?.id} failed: ${err.message}`);
        });

        // Confirmation Response Worker Events
        this.confirmationResponseWorker.on('completed', (job) => {
            devLogger('Confirmation Response Worker', `✅ Job ${job.id} completed successfully`);
        });

        this.confirmationResponseWorker.on('failed', (job, err) => {
            devLogger('Confirmation Response Worker', `❌ Job ${job?.id} failed: ${err.message}`);
        });
    }

    // Process document upload job - Execute full classification pipeline
    private async processDocumentUpload(job: Job<DocumentUploadJobData>) {
        const data = job.data;
        devLogger('Upload Worker', `🔍 Processing document upload with full classification chain: ${data.objectName}`);

        try {
            // Execute the full classification pipeline using the orchestrator
            const result = await documentProcessingOrchestrator.processDocument({
                bucketName: data.bucketName,
                objectName: data.objectName,
                objectId: data.objectId,
                namespace: data.namespace,
                userId: data.userId || `anonymous_${Date.now()}`, // Fallback if userId is missing
                documentType: data.documentType,
                source: data.source,
                eventTime: data.eventTime
            });

            if (result.success) {
                // Queue completion job for notifications and further processing
                await queueService.addDocumentCompletedJob({
                    analysisJobId: result.processingLogId,
                    extractedData: result.extractedData || {},
                    classificationResult: result.classificationResult,
                    llmVerificationResult: result.llmVerificationResult,
                    uploadJobData: data,
                    processingTime: result.processingTime,
                    status: result.status === 'COMPLETED' ? 'completed' : 
                           result.status === 'MANUAL_REVIEW_REQUIRED' ? 'manual_review' : 'failed',
                });

                devLogger('Upload Worker', `✅ Document processing completed successfully`, {
                    transactionId: result.transactionId,
                    status: result.status,
                    confidence: result.confidence,
                    processingTime: result.processingTime
                });

                return {
                    status: result.status.toLowerCase(),
                    transactionId: result.transactionId,
                    processingLogId: result.processingLogId,
                    confidence: result.confidence,
                    processingTime: result.processingTime
                };
            } else {
                // Processing failed
                await queueService.addDocumentCompletedJob({
                    analysisJobId: result.processingLogId,
                    extractedData: {},
                    uploadJobData: data,
                    processingTime: result.processingTime,
                    status: 'failed',
                    error: result.error
                });

                throw new Error(`Document processing failed: ${result.error}`);
            }

        } catch (error) {
            devLogger('Upload Worker', `❌ Error in document processing pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // BullMQ will handle retries
        }
    }

    // Check OCI Document AI analysis status
    private async checkAnalysisStatus(job: Job<DocumentAnalysisJobData>) {
        const data = job.data;
        devLogger('Analysis Worker', `🔍 Checking analysis status: ${data.analysisJobId}`);

        try {
            const result = await documentAnalyzerService.getAnalysisResult(data.analysisJobId);

            if (result.status === 'processing') {
                // Still processing, schedule another check
                const remainingRetries = (data.maxRetries || 10) - 1;

                if (remainingRetries > 0) {
                    await queueService.addDocumentAnalysisJob({
                        ...data,
                        maxRetries: remainingRetries,
                    }, {
                        delay: data.retryDelay || 30000,
                    });

                    devLogger('Analysis Worker', `⏳ Analysis still processing, will check again in ${data.retryDelay || 30000}ms. Retries left: ${remainingRetries}`);
                    return {status: 'still_processing', retriesLeft: remainingRetries};
                } else {
                    // Max retries reached
                    await queueService.addDocumentCompletedJob({
                        analysisJobId: data.analysisJobId,
                        extractedData: {},
                        uploadJobData: data.uploadJobData,
                        processingTime: Date.now() - new Date(data.uploadJobData.eventTime).getTime(),
                        status: 'failed',
                        error: 'Analysis timeout - maximum retries exceeded',
                    });

                    devLogger('Analysis Worker', `⏰ Analysis timeout for job ${data.analysisJobId}`);
                    return {status: 'timeout'};
                }
            }

            if (result.status === 'completed') {
                // Analysis completed successfully
                await queueService.addDocumentCompletedJob({
                    analysisJobId: data.analysisJobId,
                    extractedData: result.extractedData || {},
                    uploadJobData: data.uploadJobData,
                    processingTime: Date.now() - new Date(data.uploadJobData.eventTime).getTime(),
                    status: 'completed',
                });

                devLogger('Analysis Worker', `🎉 Analysis completed for job ${data.analysisJobId}`);
                return {status: 'completed', extractedData: result.extractedData};
            }

            if (result.status === 'failed') {
                // Analysis failed
                await queueService.addDocumentCompletedJob({
                    analysisJobId: data.analysisJobId,
                    extractedData: {},
                    uploadJobData: data.uploadJobData,
                    processingTime: Date.now() - new Date(data.uploadJobData.eventTime).getTime(),
                    status: 'failed',
                    error: result.error || 'Analysis failed',
                });

                devLogger('Analysis Worker', `❌ Analysis failed for job ${data.analysisJobId}: ${result.error}`);
                return {status: 'failed', error: result.error};
            }

            throw new Error(`Unexpected analysis status: ${result.status}`);
        } catch (error) {
            devLogger('Analysis Worker', `❌ Error checking analysis status: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // BullMQ will handle retries
        }
    }

    // Handle completed analysis - Send notifications, generate insights, etc.
    private async handleCompletedAnalysis(job: Job<DocumentProcessingCompletedJobData>) {
        const data = job.data;
        devLogger('Completed Worker', `🎯 Handling completed financial document analysis: ${data.analysisJobId}`);

        try {
            if (data.status === 'completed' || data.status === 'manual_review') {
                const { financialData } = data.extractedData;
                const classification = data.classificationResult;
                const llmVerification = data.llmVerificationResult;

                // Log comprehensive processing results
                const logPrefix = data.status === 'manual_review' ? '⚠️ Manual review required' : '✅ Processing completed successfully';
                devLogger('Completed Worker', `${logPrefix}:
          - Processing Log ID: ${data.analysisJobId}
          - User: ${data.uploadJobData.userId || 'Anonymous'}
          - Document: ${data.uploadJobData.objectName}
          - Processing Time: ${data.processingTime}ms
          - Transaction Type: ${classification?.transactionType || 'Unknown'}
          - Category: ${classification?.category || 'Unknown'}
          - Amount: ${classification?.currency || 'CLP'} ${classification?.amount || 0}
          - Confidence: ${(classification?.confidence || 0) * 100}%
          - Merchant: ${classification?.merchant || 'Not identified'}
          - LLM Verification: ${llmVerification ? 'Yes' : 'No'}
          - Source: ${data.uploadJobData.source || 'Unknown'}`);

                // Generate financial insights
                const insights = llmVerification ? 
                    documentClassificationLLMService.generateFinancialInsights(llmVerification) : [];

                // TODO: Implement user notifications based on source
                if (data.uploadJobData.source === 'whatsapp') {
                    // Send WhatsApp notification with transaction details
                    devLogger('Completed Worker', '📱 TODO: Send WhatsApp notification');
                } else if (data.uploadJobData.source === 'web') {
                    // Send WebSocket notification if user is online
                    devLogger('Completed Worker', '🌐 TODO: Send WebSocket notification');
                }

                // TODO: Update user financial summary
                devLogger('Completed Worker', '📊 TODO: Update user financial summary');

                // TODO: Check for budget alerts or spending patterns
                if (classification?.transactionType === 'EXPENSE' && (classification.amount || 0) > 50000) {
                    devLogger('Completed Worker', '💰 TODO: Large expense detected - check budget alerts');
                }

                return {
                    status: 'processed',
                    transactionType: classification?.transactionType,
                    category: classification?.category,
                    amount: classification?.amount || 0,
                    currency: classification?.currency || 'CLP',
                    confidence: classification?.confidence || 0,
                    insights: insights,
                    processingTime: data.processingTime
                };

            } else {
                // Handle failed processing
                devLogger('Completed Worker', `❌ Financial document processing failed:
          - Processing Log ID: ${data.analysisJobId}
          - User: ${data.uploadJobData.userId || 'Anonymous'}
          - Document: ${data.uploadJobData.objectName}
          - Error: ${data.error}
          - Processing Time: ${data.processingTime}ms`);

                // TODO: Implement failure notifications
                if (data.uploadJobData.source === 'whatsapp') {
                    devLogger('Completed Worker', '📱 TODO: Send WhatsApp error notification');
                }

                // TODO: Store failed processing for manual review
                devLogger('Completed Worker', '🔍 TODO: Queue for manual review if confidence is low');

                return {
                    status: 'failed',
                    error: data.error,
                    processingTime: data.processingTime
                };
            }

        } catch (error) {
            devLogger('Completed Worker', `❌ Error handling completed financial analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // BullMQ will handle retries
        }
    }

    // Handle confirmation request - Send message to chat interface
    private async handleConfirmationRequest(job: Job<DocumentConfirmationJobData>) {
        const data = job.data;
        devLogger('Confirmation Worker', `🔔 Processing confirmation request for user: ${data.userId}`);

        try {
            // Generate confirmation message
            const confirmationMessage = transactionConfirmationService.generateConfirmationMessage(data.transactionDetails);

            devLogger('Confirmation Worker', `📨 Sending confirmation message to chat via SSE for processing log: ${data.processingLogId}`);
            
            // Send confirmation request message to chat interface via SSE
            await asyncChatMessageService.sendTransactionConfirmationRequest(
                data.userId,
                confirmationMessage,
                data.processingLogId,
                data.transactionDetails
            );

            devLogger('Confirmation Worker', `✅ Confirmation message sent to user ${data.userId} via async messaging`);
            return {
                status: 'confirmation_sent',
                userId: data.userId,
                processingLogId: data.processingLogId,
                message: 'Confirmation request processed successfully'
            };

        } catch (error) {
            devLogger('Confirmation Worker', `❌ Error processing confirmation request: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // BullMQ will handle retries
        }
    }

    // Handle confirmation response - Process user "si"/"no" response
    private async handleConfirmationResponse(job: Job<TransactionConfirmationResponseJobData>) {
        const data = job.data;
        devLogger('Confirmation Response Worker', `📝 Processing confirmation response - User: ${data.userId}, Confirmed: ${data.confirmed}`);

        try {
            if (data.confirmed && data.transactionData) {
                // User confirmed - store the transaction
                const result = await transactionConfirmationService.storeConfirmedTransaction(
                    data.transactionData,
                    data.userId
                );

                if (result.success) {
                    devLogger('Confirmation Response Worker', `✅ Transaction stored successfully - ID: ${result.transactionId}`);
                    
                    // TODO: Send success message to chat
                    devLogger('Confirmation Response Worker', `📨 Success message: ${result.message}`);
                    
                    return {
                        status: 'confirmed_and_stored',
                        transactionId: result.transactionId,
                        message: result.message
                    };
                } else {
                    devLogger('Confirmation Response Worker', `❌ Error storing transaction: ${result.error}`);
                    
                    // TODO: Send error message to chat
                    devLogger('Confirmation Response Worker', `📨 Error message: ${result.message}`);
                    
                    return {
                        status: 'storage_failed',
                        error: result.error,
                        message: result.message
                    };
                }
            } else {
                // User rejected - don't store transaction
                devLogger('Confirmation Response Worker', `❌ Transaction rejected by user`);
                
                // TODO: Send rejection confirmation to chat
                const rejectionMessage = "❌ Transacción cancelada como solicitaste. No se guardó en tu historial financiero.";
                devLogger('Confirmation Response Worker', `📨 Rejection message: ${rejectionMessage}`);
                
                return {
                    status: 'rejected',
                    message: rejectionMessage
                };
            }

        } catch (error) {
            devLogger('Confirmation Response Worker', `❌ Error processing confirmation response: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // BullMQ will handle retries
        }
    }
}

// Export singleton instance (will be started by worker entry point)
export const documentProcessingWorker = new DocumentProcessingWorker();