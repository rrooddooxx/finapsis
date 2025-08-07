import { streamingConsumerService } from "./streaming-consumer.service";
import { financialDocumentsConfig } from "./assistant-financial-documents.config";

export class DocumentProcessingWorker {
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Document processing worker is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting document processing worker...");

    try {
      // Start the OCI streaming consumer
      await streamingConsumerService.startConsumer();
    } catch (error) {
      console.error("Error in document processing worker:", error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("Stopping document processing worker...");
    this.isRunning = false;

    try {
      await streamingConsumerService.stop();
      console.log("Document processing worker stopped");
    } catch (error) {
      console.error("Error stopping document processing worker:", error);
      throw error;
    }
  }

  isWorkerRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const documentProcessingWorker = new DocumentProcessingWorker();

// Auto-start if configured
const processingConfig = financialDocumentsConfig.getProcessingConfig();
if (processingConfig.autoStartWorker) {
  documentProcessingWorker.start().catch(console.error);
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down document worker gracefully...');
  await documentProcessingWorker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down document worker gracefully...');
  await documentProcessingWorker.stop();
  process.exit(0);
});