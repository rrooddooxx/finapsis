import * as streaming from "oci-streaming";
import { ociProviderService } from "../../providers/oci/oci-provider.service";
import { queueService } from "../../workers/services/queue.service";
import { DocumentUploadJobData } from "../../workers/jobs/document-processing.jobs";
import { devLogger } from "../../utils/logger.utils";
import { financialDocumentsConfig } from "./assistant-financial-documents.config";

export interface DocumentProcessingMessage {
  eventType: string;
  cloudEventsVersion: string;
  eventTypeVersion: string;
  source: string;
  eventTime: string;
  contentType: string;
  data: {
    compartmentId: string;
    compartmentName: string;
    resourceName: string;
    resourceId: string;
    availabilityDomain: string;
    additionalDetails: {
      bucketName: string;
      versionId: string;
      archivalState: string;
      namespace: string;
      bucketId: string;
      eTag: string;
    };
  };
  eventID: string;
  extensions: {
    compartmentId: string;
  };
}

export class StreamingConsumerService {
  private streamClient: streaming.StreamClient;
  private isRunning = false;
  
  constructor() {
    this.streamClient = ociProviderService.createStreamClient();
  }

  async startConsumer(): Promise<void> {
    const config = financialDocumentsConfig.getStreamingConfig();
    
    // Validate required configuration
    const validation = financialDocumentsConfig.validateRequiredConfig();
    if (!validation.isValid) {
      throw new Error(`Missing required environment variables: ${validation.missingKeys.join(', ')}`);
    }

    try {
      devLogger(`🚀 Starting document stream consumer`);
      devLogger(`📡 Stream Name: ${config.streamName}`);
      devLogger(`🔗 Stream OCID: ${config.streamId}`);
      devLogger(`🌐 Streaming Endpoint: ${config.endpoint}`);
      devLogger(`🏊 Stream Pool: ${config.poolName} (${config.poolOcid})`);
      devLogger(`📋 Consumer group: ${config.consumerGroup}, instance: ${config.consumerInstance}`);
      
      const cursor = await this.createGroupCursor(config.streamId, config.consumerGroup, config.consumerInstance);
      await this.processMessageLoop(config.streamId, cursor);
      
    } catch (error) {
      devLogger("❌ Error starting stream consumer:", JSON.stringify(error));
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log("Stopping streaming consumer...");
    this.isRunning = false;
  }

  private async createGroupCursor(
    streamId: string, 
    groupName: string, 
    instanceName: string
  ): Promise<string> {
    devLogger(`🎯 Creating cursor for group: ${groupName}, instance: ${instanceName}`);
    
    const cursorDetails = {
      groupName,
      instanceName,
      type: streaming.models.CreateGroupCursorDetails.Type.TrimHorizon,
      commitOnGet: true
    };

    const createCursorRequest = {
      createGroupCursorDetails: cursorDetails,
      streamId: streamId
    };

    const response = await this.streamClient.createGroupCursor(createCursorRequest);
    return response.cursor.value;
  }

  private async processMessageLoop(streamId: string, initialCursor: string): Promise<void> {
    let cursor = initialCursor;
    this.isRunning = true;

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      this.isRunning = false;
    });

    const processingConfig = financialDocumentsConfig.getProcessingConfig();
    
    while (this.isRunning) {
      try {
        const getRequest = {
          streamId: streamId,
          cursor: cursor,
          limit: processingConfig.batchSize
        };

        const response = await this.streamClient.getMessages(getRequest);
        
        if (response.items.length > 0) {
          devLogger(`📨 Processing ${response.items.length} messages`);
          
          for (const message of response.items) {
            await this.processMessage(message);
          }
        }

        cursor = response.opcNextCursor;
        await this.delay(processingConfig.pollingDelaySeconds);
        
      } catch (error) {
        console.error("Error processing messages:", error);
        await this.delay(processingConfig.errorRetryDelaySeconds);
      }
    }
  }

  private async processMessage(message: streaming.models.Message): Promise<void> {
    try {
      const messageValue = message.value ? 
        Buffer.from(message.value, "base64").toString() : null;
      
      if (!messageValue) {
        devLogger("⚠️ Received message with no value, skipping");
        return;
      }

      devLogger("📋 Raw OCI streaming message received:", messageValue);

      const documentMessage: DocumentProcessingMessage = JSON.parse(messageValue);
      
      devLogger("🔍 Parsed document message:", JSON.stringify(documentMessage, null, 2));
      devLogger(`📄 Processing document: ${documentMessage.data.resourceName} from bucket: ${documentMessage.data.additionalDetails.bucketName}`);
      
      if (!financialDocumentsConfig.isDocumentUploadEvent(documentMessage.eventType, documentMessage.data.resourceName)) {
        devLogger("⏭️ Not a document upload event, skipping");
        return;
      }

      await this.handleDocumentUpload(documentMessage);
      
    } catch (error) {
      devLogger("❌ Error processing message:", JSON.stringify(error));
    }
  }


  private async handleDocumentUpload(message: DocumentProcessingMessage): Promise<void> {
    try {
      devLogger("🎯 Processing OCI Object Storage upload event for BullMQ queue");
      
      // Extract document details from OCI message
      const documentJobData: DocumentUploadJobData = {
        // Object Storage Details
        bucketName: message.data.additionalDetails.bucketName,
        objectName: message.data.resourceName,
        objectId: message.data.resourceId,
        namespace: message.data.additionalDetails.namespace,
        
        // User Context (TODO: Extract from object metadata or naming convention)
        userId: this.extractUserIdFromObjectName(message.data.resourceName),
        source: this.determineSource(message.data.resourceName),
        
        // Document Analysis Config (use defaults for automatic processing)
        documentType: this.inferDocumentType(message.data.resourceName),
        language: 'en', // Default to English
        includeTableExtraction: true,
        
        // Event Metadata
        eventTime: message.eventTime,
        eventType: message.eventType,
        region: this.extractRegionFromSource(message.source),
      };

      devLogger("📋 Creating document upload job with data:", JSON.stringify(documentJobData, null, 2));
      
      // Add job to BullMQ queue for background processing
      const job = await queueService.addDocumentUploadJob(documentJobData, {
        priority: this.getPriorityBasedOnSource(documentJobData.source), // Higher priority for WhatsApp
      });

      devLogger(`🎯 Document upload job queued successfully: ${job.id}`);
      devLogger(`📊 Job will be processed by BullMQ worker asynchronously`);
      
    } catch (error) {
      devLogger("❌ Error handling document upload for queue:", JSON.stringify(error));
      throw error; // Let the message loop handle retries
    }
  }

  // Helper methods for extracting metadata from object names and events
  private extractUserIdFromObjectName(objectName: string): string | undefined {
    // TODO: Implement user extraction logic based on your naming convention
    // Examples:
    // - user123_receipt_20241107.jpg -> user123
    // - receipts/user456/document.pdf -> user456
    // - For now, try to extract from prefix
    const userMatch = objectName.match(/(?:^|\/|_)user(\d+)(?:_|\/|\.)/i);
    return userMatch ? `user${userMatch[1]}` : undefined;
  }

  private determineSource(objectName: string): 'whatsapp' | 'web' | 'api' {
    // TODO: Implement source detection logic
    // Examples:
    // - whatsapp/user123/receipt.jpg -> whatsapp
    // - web-uploads/receipt.jpg -> web
    // - api/documents/receipt.jpg -> api
    if (objectName.includes('whatsapp')) return 'whatsapp';
    if (objectName.includes('web')) return 'web';
    return 'api'; // Default
  }

  private inferDocumentType(objectName: string): DocumentUploadJobData['documentType'] {
    const fileName = objectName.toLowerCase();
    
    if (fileName.includes('receipt')) return 'RECEIPT';
    if (fileName.includes('invoice')) return 'INVOICE';
    if (fileName.includes('bank') || fileName.includes('statement')) return 'BANK_STATEMENT';
    if (fileName.includes('check')) return 'CHECK';
    if (fileName.includes('payslip') || fileName.includes('salary')) return 'PAYSLIP';
    if (fileName.includes('tax')) return 'TAX_FORM';
    
    return 'OTHERS'; // Default
  }

  private extractRegionFromSource(source: string): string {
    // Extract region from OCI source
    // Example: "objectstorage.us-phoenix-1.oraclecloud.com" -> "us-phoenix-1"
    const regionMatch = source.match(/\.([a-z0-9-]+)\.oraclecloud\.com/);
    return regionMatch ? regionMatch[1] : 'us-phoenix-1';
  }

  private getPriorityBasedOnSource(source: DocumentUploadJobData['source']): number {
    // Higher number = higher priority in BullMQ
    switch (source) {
      case 'whatsapp': return 20; // Highest priority for WhatsApp uploads
      case 'web': return 15;      // Medium priority for web uploads
      case 'api': return 10;      // Standard priority for API uploads
      default: return 5;          // Lowest priority for unknown sources
    }
  }


  private async delay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}

export const streamingConsumerService = new StreamingConsumerService();