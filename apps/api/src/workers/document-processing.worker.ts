import {ConnectionOptions, Job, Worker} from 'bullmq';
import {devLogger} from '../utils/logger.utils';
import {
    documentAnalyzerService
} from '../features/assistant-financial-documents/document-analyzer.service';
import {queueService} from './services/queue.service';
import {
    DocumentAnalysisJobData,
    DocumentProcessingCompletedJobData,
    DocumentUploadJobData,
    JOB_QUEUES,
} from './jobs/document-processing.jobs';

export class DocumentProcessingWorker {
    private uploadWorker!: Worker<DocumentUploadJobData>;
    private analysisWorker!: Worker<DocumentAnalysisJobData>;
    private completedWorker!: Worker<DocumentProcessingCompletedJobData>;
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
    }

    // Process document upload job - Start OCI Document AI analysis
    private async processDocumentUpload(job: Job<DocumentUploadJobData>) {
        const data = job.data;
        devLogger('Upload Worker', `🔍 Processing document upload: ${data.objectName}`);

        try {
            // Start document analysis with OCI Document AI
            const analysisResult = await documentAnalyzerService.analyzeDocument({
                bucketName: data.bucketName,
                objectName: data.objectName,
                objectId: data.objectId,
                namespace: data.namespace,
                userId: data.userId,
                config: {
                    features: [
                        {type: 'TEXT_DETECTION', maxResults: 100},
                        {type: 'KEY_VALUE_DETECTION', maxResults: 50},
                        ...(data.includeTableExtraction !== false ? [{
                            type: 'TABLE_EXTRACTION' as const,
                            maxResults: 20
                        }] : []),
                    ],
                    documentType: data.documentType,
                    language: data.language || 'es',
                    includeOutputLocation: true,
                },
            });

            if (analysisResult.status === 'processing' && analysisResult.jobId) {
                // Schedule status check job for later
                await queueService.addDocumentAnalysisJob({
                    analysisJobId: analysisResult.jobId,
                    uploadJobData: data,
                    maxRetries: 10,
                    retryDelay: 30000, // 30 seconds
                });

                devLogger('Upload Worker', `📊 Analysis job ${analysisResult.jobId} started, scheduled status checks`);
                return {status: 'analysis_started', jobId: analysisResult.jobId};
            }

            if (analysisResult.status === 'completed') {
                // Immediate completion (rare case)
                await queueService.addDocumentCompletedJob({
                    analysisJobId: analysisResult.jobId || `immediate-${Date.now()}`,
                    extractedData: analysisResult.extractedData || {},
                    uploadJobData: data,
                    processingTime: 0,
                    status: 'completed',
                });

                devLogger('Upload Worker', `🎉 Document analysis completed immediately`);
                return {status: 'completed_immediately'};
            }

            if (analysisResult.status === 'failed') {
                throw new Error(`Document analysis failed: ${analysisResult.error}`);
            }

            throw new Error(`Unexpected analysis result status: ${analysisResult.status}`);
        } catch (error) {
            devLogger('Upload Worker', `❌ Error processing document upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Handle completed analysis - Send notifications, update database, etc.
    private async handleCompletedAnalysis(job: Job<DocumentProcessingCompletedJobData>) {
        const data = job.data;
        devLogger('Completed Worker', `🎯 Handling completed analysis: ${data.analysisJobId}`);

        try {
            if (data.status === 'completed') {
                const {financialData} = data.extractedData;

                // Log successful processing
                devLogger('Completed Worker', `🎉 Document processing completed successfully:
          - Job ID: ${data.analysisJobId}
          - User: ${data.uploadJobData.userId || 'Unknown'}
          - Document: ${data.uploadJobData.objectName}
          - Processing Time: ${data.processingTime}ms
          - Amounts Found: ${financialData?.amounts?.length || 0}
          - Merchant: ${financialData?.merchant || 'Not identified'}
          - Categories: ${financialData?.categories?.join(', ') || 'None'}`);

                // TODO: Implement user notifications
                // - Send WhatsApp message if source was WhatsApp
                // - Send WebSocket notification if user is online
                // - Store results in database for later retrieval

                // TODO: Implement business logic
                // - Categorize expenses automatically
                // - Update user's financial tracking
                // - Generate insights and recommendations

                return {
                    status: 'notified',
                    extractedAmounts: financialData?.amounts?.length || 0,
                    totalAmount: financialData?.amounts?.reduce((sum, amount) => sum + amount, 0) || 0,
                };
            } else {
                // Handle failed analysis
                devLogger('Completed Worker', `❌ Document processing failed:
          - Job ID: ${data.analysisJobId}
          - User: ${data.uploadJobData.userId || 'Unknown'}
          - Document: ${data.uploadJobData.objectName}
          - Error: ${data.error}`);

                // TODO: Implement failure notifications
                // - Notify user that document processing failed
                // - Provide suggestions for resubmission

                return {status: 'failure_handled', error: data.error};
            }
        } catch (error) {
            devLogger('Completed Worker', `❌ Error handling completed analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // BullMQ will handle retries
        }
    }
}

// Export singleton instance (will be started by worker entry point)
export const documentProcessingWorker = new DocumentProcessingWorker();