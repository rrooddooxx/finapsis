import {ConnectionOptions, Queue, QueueOptions} from 'bullmq';
import {devLogger} from '../../utils/logger.utils';
import {
  DocumentAnalysisJobData,
  DocumentProcessingCompletedJobData,
  DocumentUploadJobData,
  JOB_QUEUES,
  JOB_TYPES
} from '../jobs/document-processing.jobs';

export class QueueService {
    private readonly documentUploadQueue: Queue<DocumentUploadJobData>;
    private readonly documentAnalysisQueue: Queue<DocumentAnalysisJobData>;
    private readonly documentCompletedQueue: Queue<DocumentProcessingCompletedJobData>;
    private readonly connection: ConnectionOptions;

    constructor() {
        // Redis connection configuration
        this.connection = {

            host: Bun.env.REDIS_HOST || 'localhost',
            port: parseInt(Bun.env.REDIS_PORT || '6379'),
            password: Bun.env.REDIS_PASSWORD,
            db: parseInt(Bun.env.REDIS_DB || '0'),
        };

        const queueOptions: QueueOptions = {
            connection: this.connection,
            defaultJobOptions: {
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 50,      // Keep last 50 failed jobs
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        };

        // Initialize queues
        this.documentUploadQueue = new Queue(JOB_QUEUES.DOCUMENT_UPLOAD, queueOptions);
        this.documentAnalysisQueue = new Queue(JOB_QUEUES.DOCUMENT_ANALYSIS, queueOptions);
        this.documentCompletedQueue = new Queue(JOB_QUEUES.DOCUMENT_COMPLETED, queueOptions);

        devLogger('Queue Service', '📋 BullMQ queues initialized');
    }

    // Add document upload job (triggered by OCI streaming event)
    async addDocumentUploadJob(data: DocumentUploadJobData, options?: {
        priority?: number;
        delay?: number;
    }) {
        const job = await this.documentUploadQueue.add(
            JOB_TYPES.PROCESS_DOCUMENT_UPLOAD,
            data,
            {
                priority: options?.priority || 10,
                delay: options?.delay || 0,
                jobId: `upload-${data.objectId}-${Date.now()}`,
            }
        );

        devLogger('Queue Service', `📋 Document upload job added: ${job.id}`);
        return job;
    }

    // Add document analysis status check job (for polling OCI Document AI)
    async addDocumentAnalysisJob(data: DocumentAnalysisJobData, options?: {
        delay?: number;
    }) {
        const job = await this.documentAnalysisQueue.add(
            JOB_TYPES.CHECK_ANALYSIS_STATUS,
            data,
            {
                delay: options?.delay || 30000, // Check after 30 seconds by default
                jobId: `analysis-${data.analysisJobId}-${Date.now()}`,
            }
        );

        devLogger('Queue Service', `📋 Document analysis status job added: ${job.id}`);
        return job;
    }

    // Add completed document processing job (for notifications, etc.)
    async addDocumentCompletedJob(data: DocumentProcessingCompletedJobData) {
        const job = await this.documentCompletedQueue.add(
            JOB_TYPES.HANDLE_COMPLETED_ANALYSIS,
            data,
            {
                jobId: `completed-${data.analysisJobId}-${Date.now()}`,
            }
        );

        devLogger('Queue Service', `📋 Document completed job added: ${job.id}`);
        return job;
    }

    // Get queue instances for worker registration
    getDocumentUploadQueue() {
        return this.documentUploadQueue;
    }

    getDocumentAnalysisQueue() {
        return this.documentAnalysisQueue;
    }

    getDocumentCompletedQueue() {
        return this.documentCompletedQueue;
    }

    // Health check for queues
    async getQueueStats() {
        const uploadStats = await this.documentUploadQueue.getJobCounts();
        const analysisStats = await this.documentAnalysisQueue.getJobCounts();
        const completedStats = await this.documentCompletedQueue.getJobCounts();

        return {
            documentUpload: uploadStats,
            documentAnalysis: analysisStats,
            documentCompleted: completedStats,
        };
    }

    // Graceful shutdown
    async shutdown() {
        devLogger('Queue Service', '📋 Shutting down BullMQ queues...');

        await this.documentUploadQueue.close();
        await this.documentAnalysisQueue.close();
        await this.documentCompletedQueue.close();

        devLogger('Queue Service', '📋 BullMQ queues closed');
    }
}

// Singleton instance
export const queueService = new QueueService();