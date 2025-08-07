import { DocumentAnalysisRequest, DocumentAnalysisConfig, DocumentAnalysisFeatureType } from "./document-analyzer.service";
import { DocumentProcessingMessage } from "./streaming-consumer.service";
import { financialDocumentsConfig } from "./assistant-financial-documents.config";

export class DocumentAnalyzerMapper {
  
  static mapOCIMessageToAnalysisRequest(message: DocumentProcessingMessage): DocumentAnalysisRequest {
    const config = this.buildConfigFromMessage(message);
    
    return {
      bucketName: message.data.additionalDetails.bucketName,
      objectName: message.data.resourceName,
      objectId: message.data.additionalDetails.eTag,
      namespace: message.data.additionalDetails.namespace,
      compartmentId: message.data.compartmentId,
      userId: this.extractUserIdFromMessage(message),
      config
    };
  }

  static buildConfigFromMessage(message: DocumentProcessingMessage): DocumentAnalysisConfig {
    // Build configuration based on document type and context
    const fileName = message.data.resourceName;
    const detectedType = financialDocumentsConfig.detectDocumentType(fileName);
    const language = financialDocumentsConfig.detectLanguage(fileName, message.data.compartmentName);
    
    // Ensure documentType matches the expected union type
    const documentType: DocumentAnalysisConfig['documentType'] = 
      ['INVOICE', 'RECEIPT', 'BANK_STATEMENT', 'CHECK', 'PAYSLIP', 'TAX_FORM', 'OTHERS'].includes(detectedType) 
        ? detectedType as DocumentAnalysisConfig['documentType']
        : 'OTHERS';
    
    return {
      features: financialDocumentsConfig.getFeaturesForDocumentType(detectedType),
      documentType,
      language,
      includeOutputLocation: true
    };
  }


  static extractUserIdFromMessage(message: DocumentProcessingMessage): string | undefined {
    // Try to extract user ID from resource path, object metadata, or other sources
    // This could be enhanced to check object tags or metadata
    const resourcePath = message.data.resourceId;
    
    // Example: if the object path contains user info like /user-123/document.pdf
    const userIdMatch = resourcePath.match(/\/user-([^\/]+)\//);
    if (userIdMatch) {
      return userIdMatch[1];
    }
    
    // Could also check object name patterns
    const objectName = message.data.resourceName;
    const userInNameMatch = objectName.match(/^user-([^-]+)-/);
    if (userInNameMatch) {
      return userInNameMatch[1];
    }

    // Try to extract from folder structure like /uploads/{userId}/document.pdf
    const folderMatch = resourcePath.match(/\/uploads\/([^\/]+)\//);
    if (folderMatch) {
      return folderMatch[1];
    }
    
    return undefined; // User ID not found in message
  }

  static mapOCIMessageToProcessingStatus(message: DocumentProcessingMessage, jobId?: string, status?: string, error?: string) {
    return {
      objectName: message.data.resourceName,
      objectId: message.data.additionalDetails.eTag,
      bucketName: message.data.additionalDetails.bucketName,
      namespace: message.data.additionalDetails.namespace,
      bucketId: message.data.additionalDetails.bucketId,
      versionId: message.data.additionalDetails.versionId,
      eventId: message.eventID,
      jobId,
      userId: this.extractUserIdFromMessage(message),
      status,
      error,
      createdAt: message.eventTime
    };
  }
}