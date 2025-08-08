import { Job } from 'bullmq';

export interface DocumentUploadJobData {
  // Object Storage Details
  bucketName: string;
  objectName: string;
  objectId: string;
  namespace: string;
  
  // User Context
  userId?: string;
  source: 'whatsapp' | 'web' | 'api';
  
  // Document Analysis Config
  documentType?: 'INVOICE' | 'RECEIPT' | 'BANK_STATEMENT' | 'CHECK' | 'PAYSLIP' | 'TAX_FORM' | 'OTHERS';
  language?: string;
  includeTableExtraction?: boolean;
  
  // Event Metadata
  eventTime: string;
  eventType: string;
  region: string;
}

export interface DocumentAnalysisJobData {
  // Document Analysis Job
  analysisJobId: string;
  
  // Original Upload Context
  uploadJobData: DocumentUploadJobData;
  
  // Analysis Config
  maxRetries?: number;
  retryDelay?: number;
}

export interface DocumentProcessingCompletedJobData {
  // Analysis Results
  analysisJobId: string;
  extractedData: {
    text?: string;
    financialData?: {
      amounts?: number[];
      dates?: string[];
      categories?: string[];
      merchant?: string | null;
    };
    tables?: any[];
    keyValues?: any[];
    documentClassification?: {
      documentType: string;
      confidence: number;
      categories: string[];
      language?: string;
    };
    metadata?: {
      pageCount?: number;
      mimeType?: string;
      extractedAt?: string;
    };
  };
  
  // Classification Results
  classificationResult?: {
    transactionType: 'INCOME' | 'EXPENSE';
    category: string;
    subcategory?: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    description: string;
    merchant?: string;
    confidence: number;
    reasoning: string;
  };
  
  llmVerificationResult?: {
    transactionType: 'INCOME' | 'EXPENSE';
    category: string;
    amount: number;
    confidence: number;
    discrepancies?: string[];
  };
  
  // Original Context
  uploadJobData: DocumentUploadJobData;
  
  // Processing Metadata
  processingTime: number;
  status: 'completed' | 'failed' | 'manual_review';
  error?: string;
}

export interface DocumentConfirmationJobData {
  // Processing Results to be confirmed
  processingLogId: string;
  userId: string;
  
  // Transaction Details for User Confirmation
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
  
  // Analysis Context for Storage
  analysisContext: {
    documentId: string;
    extractedData: any;
    classificationResult: any;
    llmVerificationResult?: any;
    visionAnalysisResult?: any;
    processingTime: number;
  };
  
  // Original Upload Context
  uploadJobData: DocumentUploadJobData;
  
  // Confirmation Settings
  expiryTime?: Date; // Auto-confirm after X time if no response
  retryCount?: number;
}

export interface TransactionConfirmationResponseJobData {
  // Reference to original confirmation
  confirmationJobId: string;
  processingLogId: string;
  userId: string;
  
  // User Response
  confirmed: boolean; // true for "si", false for "no"
  userMessage?: string; // Original user message that contained the response
  
  // Transaction Data to Store (if confirmed)
  transactionData?: {
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
  };
}

export type DocumentProcessingJob = Job<DocumentUploadJobData>;
export type DocumentAnalysisJob = Job<DocumentAnalysisJobData>;
export type DocumentCompletedJob = Job<DocumentProcessingCompletedJobData>;
export type DocumentConfirmationJob = Job<DocumentConfirmationJobData>;
export type TransactionConfirmationResponseJob = Job<TransactionConfirmationResponseJobData>;

// Job Queue Names
export const JOB_QUEUES = {
  DOCUMENT_UPLOAD: 'document-upload',
  DOCUMENT_ANALYSIS: 'document-analysis', 
  DOCUMENT_COMPLETED: 'document-completed',
  DOCUMENT_CONFIRMATION: 'document-confirmation',
  TRANSACTION_CONFIRMATION_RESPONSE: 'transaction-confirmation-response',
} as const;

// Job Types
export const JOB_TYPES = {
  PROCESS_DOCUMENT_UPLOAD: 'process-document-upload',
  CHECK_ANALYSIS_STATUS: 'check-analysis-status',
  CLASSIFY_FINANCIAL_TRANSACTION: 'classify-financial-transaction',
  VERIFY_WITH_LLM: 'verify-with-llm',
  STORE_FINANCIAL_TRANSACTION: 'store-financial-transaction',
  HANDLE_COMPLETED_ANALYSIS: 'handle-completed-analysis',
  REQUEST_USER_CONFIRMATION: 'request-user-confirmation',
  PROCESS_CONFIRMATION_RESPONSE: 'process-confirmation-response',
} as const;