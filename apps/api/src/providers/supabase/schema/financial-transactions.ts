import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  decimal, 
  timestamp, 
  jsonb, 
  index,
  pgEnum
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "../utils";

// Enum for transaction types
export const transactionTypeEnum = pgEnum('transaction_type', ['INCOME', 'EXPENSE']);

// Enum for transaction status
export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING_CLASSIFICATION',
  'CLASSIFIED', 
  'MANUAL_REVIEW',
  'VERIFIED',
  'REJECTED'
]);

export const financialTransactions = pgTable(
  'financial_transactions',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    
    // User and document reference
    userId: varchar('user_id', { length: 191 }).notNull(),
    documentId: varchar('document_id', { length: 191 }), // Reference to processed document
    
    // Transaction classification
    transactionType: transactionTypeEnum('transaction_type').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    subcategory: varchar('subcategory', { length: 100 }),
    
    // Financial data
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('CLP'), // Chilean Peso default
    
    // Transaction details
    transactionDate: timestamp('transaction_date').notNull(),
    description: text('description').notNull(),
    merchant: varchar('merchant', { length: 255 }),
    
    // Classification confidence and processing
    confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }), // 0.00 to 1.00
    status: transactionStatusEnum('status').notNull().default('PENDING_CLASSIFICATION'),
    processingMethod: varchar('processing_method', { length: 50 }).notNull(), // 'AUTO_OCR', 'AUTO_LLM', 'MANUAL', 'HYBRID'
    
    // Document processing metadata
    metadata: jsonb('metadata'), // Store extracted data, confidence details, etc.
    
    // Audit trail
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
    classifiedAt: timestamp('classified_at'),
    verifiedAt: timestamp('verified_at'),
  },
  (table) => ({
    // Indexes for efficient querying
    userIdIndex: index('financial_transactions_user_id_index').on(table.userId),
    transactionDateIndex: index('financial_transactions_date_index').on(table.transactionDate),
    categoryIndex: index('financial_transactions_category_index').on(table.category),
    statusIndex: index('financial_transactions_status_index').on(table.status),
    typeIndex: index('financial_transactions_type_index').on(table.transactionType),
    
    // Composite indexes for common queries
    userDateIndex: index('financial_transactions_user_date_index').on(table.userId, table.transactionDate),
    userTypeIndex: index('financial_transactions_user_type_index').on(table.userId, table.transactionType),
    userCategoryIndex: index('financial_transactions_user_category_index').on(table.userId, table.category),
    
    // GIN index for metadata JSONB queries
    metadataIndex: index('financial_transactions_metadata_index').using('gin', table.metadata),
  })
);

// Zod schemas for validation
export const insertFinancialTransactionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  documentId: z.string().optional(),
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1, "Category is required").max(100),
  subcategory: z.string().max(100).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal with up to 2 decimal places"),
  currency: z.string().length(3, "Currency must be 3 characters").default('CLP'),
  transactionDate: z.date(),
  description: z.string().min(1, "Description is required"),
  merchant: z.string().max(255).optional(),
  confidenceScore: z.string().regex(/^(0(\.\d{1,2})?|1(\.0{1,2})?)$/, "Confidence score must be a decimal between 0.00 and 1.00").optional(),
  status: z.enum(['PENDING_CLASSIFICATION', 'CLASSIFIED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED']).default('PENDING_CLASSIFICATION'),
  processingMethod: z.enum(['AUTO_OCR', 'AUTO_LLM', 'MANUAL', 'HYBRID']),
  metadata: z.record(z.any()).optional(),
});

export const updateFinancialTransactionSchema = insertFinancialTransactionSchema
  .partial()
  .omit({ userId: true }); // User ID should not be updatable

// Select schema for API responses
export const selectFinancialTransactionSchema = createSelectSchema(financialTransactions);

// Types for TypeScript
export type NewFinancialTransactionParams = z.infer<typeof insertFinancialTransactionSchema>;
export type UpdateFinancialTransactionParams = z.infer<typeof updateFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

// Metadata schema for different processing methods
export const ocrMetadataSchema = z.object({
  processingMethod: z.literal('AUTO_OCR'),
  ocrConfidence: z.number().min(0).max(1).optional(),
  extractedText: z.string().optional(),
  documentType: z.string().optional(),
  oracleJobId: z.string().optional(),
});

export const llmMetadataSchema = z.object({
  processingMethod: z.literal('AUTO_LLM'),
  llmModel: z.string().optional(),
  llmConfidence: z.number().min(0).max(1).optional(),
  prompt: z.string().optional(),
  extractedEntities: z.record(z.any()).optional(),
});

export const hybridMetadataSchema = z.object({
  processingMethod: z.literal('HYBRID'),
  ocrData: ocrMetadataSchema.omit({ processingMethod: true }).optional(),
  llmData: llmMetadataSchema.omit({ processingMethod: true }).optional(),
  combinedConfidence: z.number().min(0).max(1).optional(),
});

export const manualMetadataSchema = z.object({
  processingMethod: z.literal('MANUAL'),
  enteredBy: z.string().optional(),
  notes: z.string().optional(),
});

// Union type for all metadata schemas
export const transactionMetadataSchema = z.union([
  ocrMetadataSchema,
  llmMetadataSchema,
  hybridMetadataSchema,
  manualMetadataSchema,
]);

export type TransactionMetadata = z.infer<typeof transactionMetadataSchema>;