import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  decimal,
  timestamp, 
  jsonb, 
  index,
  pgEnum,
  integer
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "../utils";

// Enum for processing status - match database order
export const processingStatusEnum = pgEnum('processing_status', [
  'QUEUED',
  'PROCESSING_OCR',
  'PROCESSING_CLASSIFICATION',
  'PROCESSING_LLM_VERIFICATION',
  'COMPLETED',
  'FAILED',
  'TIMEOUT',
  'MANUAL_REVIEW_REQUIRED',
  'PROCESSING_VISION',
  'PENDING_CONFIRMATION'
]);

// Enum for processing stage - match database order  
export const processingStageEnum = pgEnum('processing_stage', [
  'DOCUMENT_UPLOAD',
  'OCR_EXTRACTION',
  'DOCUMENT_CLASSIFICATION', 
  'TEXT_ANALYSIS',
  'LLM_VERIFICATION',
  'TRANSACTION_CREATION',
  'CONFIDENCE_SCORING',
  'FINAL_VALIDATION',
  'VISION_ANALYSIS',
  'USER_CONFIRMATION',
  'CONFIRMATION_PROCESSING'
]);

export const documentProcessingLogs = pgTable(
  'document_processing_logs',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    
    // Document reference
    documentId: varchar('document_id', { length: 191 }).notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    transactionId: varchar('transaction_id', { length: 191 }), // Set when transaction is created
    
    // Object storage details
    bucketName: varchar('bucket_name', { length: 255 }).notNull(),
    objectName: varchar('object_name', { length: 500 }).notNull(),
    namespace: varchar('namespace', { length: 255 }).notNull(),
    
    // Processing status
    status: processingStatusEnum('status').notNull().default('QUEUED'),
    currentStage: processingStageEnum('current_stage').notNull().default('DOCUMENT_UPLOAD'),
    
    // Processing details
    documentType: varchar('document_type', { length: 50 }), // RECEIPT, INVOICE, etc.
    detectedLanguage: varchar('detected_language', { length: 10 }).default('es'),
    
    // Confidence and scoring
    overallConfidence: decimal('overall_confidence', { precision: 3, scale: 2 }), // 0.00 to 1.00
    ocrConfidence: decimal('ocr_confidence', { precision: 3, scale: 2 }),
    classificationConfidence: decimal('classification_confidence', { precision: 3, scale: 2 }),
    llmConfidence: decimal('llm_confidence', { precision: 3, scale: 2 }),
    
    // Processing times (in milliseconds)
    totalProcessingTime: integer('total_processing_time'),
    ocrProcessingTime: integer('ocr_processing_time'),
    classificationProcessingTime: integer('classification_processing_time'),
    llmProcessingTime: integer('llm_processing_time'),
    
    // External service references
    oracleJobId: varchar('oracle_job_id', { length: 191 }),
    openaiRequestId: varchar('openai_request_id', { length: 191 }),
    
    // Processing results and metadata
    extractedData: jsonb('extracted_data'), // Raw OCR and classification results
    llmResponse: jsonb('llm_response'), // LLM verification response
    errors: jsonb('errors'), // Array of error messages by stage
    
    // Timing
    queuedAt: timestamp('queued_at').notNull().default(sql`now()`),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    failedAt: timestamp('failed_at'),
    
    // Audit trail
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (table) => ({
    // Indexes for efficient querying
    documentIdIndex: index('document_processing_logs_document_id_index').on(table.documentId),
    userIdIndex: index('document_processing_logs_user_id_index').on(table.userId),
    statusIndex: index('document_processing_logs_status_index').on(table.status),
    stageIndex: index('document_processing_logs_stage_index').on(table.currentStage),
    transactionIdIndex: index('document_processing_logs_transaction_id_index').on(table.transactionId),
    
    // Composite indexes for common queries
    userStatusIndex: index('document_processing_logs_user_status_index').on(table.userId, table.status),
    statusStageIndex: index('document_processing_logs_status_stage_index').on(table.status, table.currentStage),
    dateStatusIndex: index('document_processing_logs_date_status_index').on(table.createdAt, table.status),
    
    // Oracle service reference index
    oracleJobIndex: index('document_processing_logs_oracle_job_index').on(table.oracleJobId),
    
    // GIN indexes for JSONB fields
    extractedDataIndex: index('document_processing_logs_extracted_data_index').using('gin', table.extractedData),
    errorsIndex: index('document_processing_logs_errors_index').using('gin', table.errors),
  })
);

// Zod schemas for validation
export const insertDocumentProcessingLogSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  userId: z.string().min(1, "User ID is required"),
  transactionId: z.string().optional(),
  bucketName: z.string().min(1, "Bucket name is required"),
  objectName: z.string().min(1, "Object name is required"),
  namespace: z.string().min(1, "Namespace is required"),
  status: z.enum(['QUEUED', 'PROCESSING_OCR', 'PROCESSING_CLASSIFICATION', 'PROCESSING_LLM_VERIFICATION', 'COMPLETED', 'FAILED', 'TIMEOUT', 'MANUAL_REVIEW_REQUIRED', 'PROCESSING_VISION', 'PENDING_CONFIRMATION']).default('QUEUED'),
  currentStage: z.enum(['DOCUMENT_UPLOAD', 'OCR_EXTRACTION', 'DOCUMENT_CLASSIFICATION', 'TEXT_ANALYSIS', 'LLM_VERIFICATION', 'TRANSACTION_CREATION', 'CONFIDENCE_SCORING', 'FINAL_VALIDATION', 'VISION_ANALYSIS', 'USER_CONFIRMATION', 'CONFIRMATION_PROCESSING']).default('DOCUMENT_UPLOAD'),
  documentType: z.string().max(50).optional(),
  detectedLanguage: z.string().max(10).default('es'),
  overallConfidence: z.number().min(0).max(1).optional(),
  ocrConfidence: z.number().min(0).max(1).optional(),
  classificationConfidence: z.number().min(0).max(1).optional(),
  llmConfidence: z.number().min(0).max(1).optional(),
  totalProcessingTime: z.number().int().positive().optional(),
  ocrProcessingTime: z.number().int().positive().optional(),
  classificationProcessingTime: z.number().int().positive().optional(),
  llmProcessingTime: z.number().int().positive().optional(),
  oracleJobId: z.string().optional(),
  openaiRequestId: z.string().optional(),
  extractedData: z.record(z.any()).optional(),
  llmResponse: z.record(z.any()).optional(),
  errors: z.array(z.string()).optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failedAt: z.date().optional(),
});

export const updateDocumentProcessingLogSchema = insertDocumentProcessingLogSchema
  .partial()
  .omit({ documentId: true, userId: true }); // These should not be updatable

// Select schema for API responses
export const selectDocumentProcessingLogSchema = createSelectSchema(documentProcessingLogs);

// Types for TypeScript
export type NewDocumentProcessingLogParams = z.infer<typeof insertDocumentProcessingLogSchema>;
export type UpdateDocumentProcessingLogParams = z.infer<typeof updateDocumentProcessingLogSchema>;
export type DocumentProcessingLog = typeof documentProcessingLogs.$inferSelect;

// Extracted data schema for OCR results
export const ocrExtractedDataSchema = z.object({
  extractedText: z.string(),
  pages: z.array(z.object({
    pageNumber: z.number(),
    words: z.array(z.object({
      text: z.string(),
      confidence: z.number().optional(),
      boundingBox: z.array(z.number()).optional(),
    })),
    tables: z.array(z.record(z.any())).optional(),
    keyValuePairs: z.array(z.object({
      key: z.string(),
      value: z.string(),
      confidence: z.number().optional(),
    })).optional(),
  })),
  financialData: z.object({
    amounts: z.array(z.number()),
    dates: z.array(z.string()),
    categories: z.array(z.string()),
    merchant: z.string().nullable(),
  }).optional(),
  documentClassification: z.object({
    documentType: z.string(),
    confidence: z.number(),
    categories: z.array(z.string()),
  }).optional(),
});

// LLM response schema
export const llmResponseSchema = z.object({
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  category: z.string(),
  subcategory: z.string().optional(),
  amount: z.number(),
  currency: z.string().default('CLP'),
  merchant: z.string().optional(),
  description: z.string(),
  transactionDate: z.string(), // ISO date string
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  extractedEntities: z.record(z.any()).optional(),
});

// Error tracking schema
export const processingErrorSchema = z.object({
  stage: z.enum(['DOCUMENT_UPLOAD', 'OCR_EXTRACTION', 'DOCUMENT_CLASSIFICATION', 'TEXT_ANALYSIS', 'LLM_VERIFICATION', 'TRANSACTION_CREATION', 'CONFIDENCE_SCORING', 'FINAL_VALIDATION', 'VISION_ANALYSIS', 'USER_CONFIRMATION', 'CONFIRMATION_PROCESSING']),
  error: z.string(),
  timestamp: z.string(), // ISO timestamp
  details: z.record(z.any()).optional(),
});

// Union types for metadata
export type OCRExtractedData = z.infer<typeof ocrExtractedDataSchema>;
export type LLMResponse = z.infer<typeof llmResponseSchema>;
export type ProcessingError = z.infer<typeof processingErrorSchema>;