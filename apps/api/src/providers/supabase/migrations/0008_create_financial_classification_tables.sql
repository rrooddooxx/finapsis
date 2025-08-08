-- Migration: Create Financial Classification Tables
-- Description: Add tables for financial document classification and transaction tracking

-- Create enums first
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE');
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING_CLASSIFICATION', 'CLASSIFIED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE "public"."processing_status" AS ENUM('QUEUED', 'PROCESSING_OCR', 'PROCESSING_CLASSIFICATION', 'PROCESSING_LLM_VERIFICATION', 'COMPLETED', 'FAILED', 'TIMEOUT', 'MANUAL_REVIEW_REQUIRED');
CREATE TYPE "public"."processing_stage" AS ENUM('DOCUMENT_UPLOAD', 'OCR_EXTRACTION', 'DOCUMENT_CLASSIFICATION', 'TEXT_ANALYSIS', 'LLM_VERIFICATION', 'VISION_ANALYSIS', 'TRANSACTION_CREATION', 'CONFIDENCE_SCORING', 'FINAL_VALIDATION');
CREATE TYPE "public"."summary_period" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- 1. Transaction Categories Table
CREATE TABLE IF NOT EXISTS "transaction_categories" (
    "id" varchar(191) PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL UNIQUE,
    "display_name" varchar(150) NOT NULL,
    "parent_category_id" varchar(191),
    "level" integer NOT NULL DEFAULT 0,
    "sort_order" integer NOT NULL DEFAULT 0,
    "transaction_type" "transaction_type" NOT NULL,
    "description" text,
    "icon" varchar(50),
    "color" varchar(7),
    "is_chilean_specific" boolean NOT NULL DEFAULT true,
    "sii_category" varchar(100),
    "is_active" boolean NOT NULL DEFAULT true,
    "is_system_category" boolean NOT NULL DEFAULT true,
    "keywords" jsonb,
    "patterns" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Financial Transactions Table
CREATE TABLE IF NOT EXISTS "financial_transactions" (
    "id" varchar(191) PRIMARY KEY NOT NULL,
    "user_id" varchar(191) NOT NULL,
    "document_id" varchar(191),
    "transaction_type" "transaction_type" NOT NULL,
    "category" varchar(100) NOT NULL,
    "subcategory" varchar(100),
    "amount" numeric(15,2) NOT NULL,
    "currency" varchar(3) NOT NULL DEFAULT 'CLP',
    "transaction_date" timestamp NOT NULL,
    "description" text NOT NULL,
    "merchant" varchar(255),
    "confidence_score" numeric(3,2),
    "status" "transaction_status" NOT NULL DEFAULT 'PENDING_CLASSIFICATION',
    "processing_method" varchar(50) NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "classified_at" timestamp,
    "verified_at" timestamp
);

-- 3. Document Processing Logs Table
CREATE TABLE IF NOT EXISTS "document_processing_logs" (
    "id" varchar(191) PRIMARY KEY NOT NULL,
    "document_id" varchar(191) NOT NULL,
    "user_id" varchar(191) NOT NULL,
    "transaction_id" varchar(191),
    "bucket_name" varchar(255) NOT NULL,
    "object_name" varchar(500) NOT NULL,
    "namespace" varchar(255) NOT NULL,
    "status" "processing_status" NOT NULL DEFAULT 'QUEUED',
    "current_stage" "processing_stage" NOT NULL DEFAULT 'DOCUMENT_UPLOAD',
    "document_type" varchar(50),
    "detected_language" varchar(10) DEFAULT 'es',
    "overall_confidence" numeric(3,2),
    "ocr_confidence" numeric(3,2),
    "classification_confidence" numeric(3,2),
    "llm_confidence" numeric(3,2),
    "total_processing_time" integer,
    "ocr_processing_time" integer,
    "classification_processing_time" integer,
    "llm_processing_time" integer,
    "oracle_job_id" varchar(191),
    "openai_request_id" varchar(191),
    "extracted_data" jsonb,
    "llm_response" jsonb,
    "errors" jsonb,
    "queued_at" timestamp DEFAULT now() NOT NULL,
    "started_at" timestamp,
    "completed_at" timestamp,
    "failed_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 4. User Financial Summary Table
CREATE TABLE IF NOT EXISTS "user_financial_summary" (
    "id" varchar(191) PRIMARY KEY NOT NULL,
    "user_id" varchar(191) NOT NULL,
    "period" "summary_period" NOT NULL,
    "period_start" date NOT NULL,
    "period_end" date NOT NULL,
    "total_income" numeric(15,2) NOT NULL DEFAULT '0',
    "total_expenses" numeric(15,2) NOT NULL DEFAULT '0',
    "net_income" numeric(15,2) NOT NULL DEFAULT '0',
    "income_transaction_count" integer NOT NULL DEFAULT 0,
    "expense_transaction_count" integer NOT NULL DEFAULT 0,
    "total_transaction_count" integer NOT NULL DEFAULT 0,
    "expense_category_breakdown" jsonb,
    "income_category_breakdown" jsonb,
    "top_merchants" jsonb,
    "top_expense_categories" jsonb,
    "clp_total_income" numeric(15,2) NOT NULL DEFAULT '0',
    "clp_total_expenses" numeric(15,2) NOT NULL DEFAULT '0',
    "clp_net_income" numeric(15,2) NOT NULL DEFAULT '0',
    "savings_rate" numeric(5,2),
    "expense_growth_rate" numeric(5,2),
    "income_growth_rate" numeric(5,2),
    "documents_processed" integer NOT NULL DEFAULT 0,
    "average_processing_confidence" numeric(3,2),
    "manually_reviewed_transactions" integer NOT NULL DEFAULT 0,
    "insights" jsonb,
    "calculated_at" timestamp DEFAULT now() NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for transaction_categories
CREATE INDEX "transaction_categories_name_index" ON "transaction_categories" ("name");
CREATE INDEX "transaction_categories_type_index" ON "transaction_categories" ("transaction_type");
CREATE INDEX "transaction_categories_parent_index" ON "transaction_categories" ("parent_category_id");
CREATE INDEX "transaction_categories_level_index" ON "transaction_categories" ("level");
CREATE INDEX "transaction_categories_active_index" ON "transaction_categories" ("is_active");
CREATE INDEX "transaction_categories_type_active_index" ON "transaction_categories" ("transaction_type", "is_active");
CREATE INDEX "transaction_categories_parent_level_index" ON "transaction_categories" ("parent_category_id", "level");
CREATE INDEX "transaction_categories_keywords_index" ON "transaction_categories" USING gin ("keywords");
CREATE INDEX "transaction_categories_patterns_index" ON "transaction_categories" USING gin ("patterns");

-- Create indexes for financial_transactions
CREATE INDEX "financial_transactions_user_id_index" ON "financial_transactions" ("user_id");
CREATE INDEX "financial_transactions_date_index" ON "financial_transactions" ("transaction_date");
CREATE INDEX "financial_transactions_category_index" ON "financial_transactions" ("category");
CREATE INDEX "financial_transactions_status_index" ON "financial_transactions" ("status");
CREATE INDEX "financial_transactions_type_index" ON "financial_transactions" ("transaction_type");
CREATE INDEX "financial_transactions_user_date_index" ON "financial_transactions" ("user_id", "transaction_date");
CREATE INDEX "financial_transactions_user_type_index" ON "financial_transactions" ("user_id", "transaction_type");
CREATE INDEX "financial_transactions_user_category_index" ON "financial_transactions" ("user_id", "category");
CREATE INDEX "financial_transactions_metadata_index" ON "financial_transactions" USING gin ("metadata");

-- Create indexes for document_processing_logs
CREATE INDEX "document_processing_logs_document_id_index" ON "document_processing_logs" ("document_id");
CREATE INDEX "document_processing_logs_user_id_index" ON "document_processing_logs" ("user_id");
CREATE INDEX "document_processing_logs_status_index" ON "document_processing_logs" ("status");
CREATE INDEX "document_processing_logs_stage_index" ON "document_processing_logs" ("current_stage");
CREATE INDEX "document_processing_logs_transaction_id_index" ON "document_processing_logs" ("transaction_id");
CREATE INDEX "document_processing_logs_user_status_index" ON "document_processing_logs" ("user_id", "status");
CREATE INDEX "document_processing_logs_status_stage_index" ON "document_processing_logs" ("status", "current_stage");
CREATE INDEX "document_processing_logs_date_status_index" ON "document_processing_logs" ("created_at", "status");
CREATE INDEX "document_processing_logs_oracle_job_index" ON "document_processing_logs" ("oracle_job_id");
CREATE INDEX "document_processing_logs_extracted_data_index" ON "document_processing_logs" USING gin ("extracted_data");
CREATE INDEX "document_processing_logs_errors_index" ON "document_processing_logs" USING gin ("errors");

-- Create indexes for user_financial_summary
CREATE INDEX "user_financial_summary_user_id_index" ON "user_financial_summary" ("user_id");
CREATE INDEX "user_financial_summary_period_index" ON "user_financial_summary" ("period");
CREATE INDEX "user_financial_summary_period_start_index" ON "user_financial_summary" ("period_start");
CREATE INDEX "user_financial_summary_user_period_index" ON "user_financial_summary" ("user_id", "period");
CREATE INDEX "user_financial_summary_user_date_index" ON "user_financial_summary" ("user_id", "period_start");
CREATE INDEX "user_financial_summary_period_date_index" ON "user_financial_summary" ("period", "period_start");
CREATE INDEX "user_financial_summary_expense_category_index" ON "user_financial_summary" USING gin ("expense_category_breakdown");
CREATE INDEX "user_financial_summary_income_category_index" ON "user_financial_summary" USING gin ("income_category_breakdown");
CREATE INDEX "user_financial_summary_top_merchants_index" ON "user_financial_summary" USING gin ("top_merchants");
CREATE INDEX "user_financial_summary_insights_index" ON "user_financial_summary" USING gin ("insights");

-- Create unique constraint for user financial summary
CREATE UNIQUE INDEX "user_financial_summary_user_period_unique" ON "user_financial_summary" ("user_id", "period", "period_start", "period_end");

-- Add foreign key constraint for transaction categories (self-referencing)
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "transaction_categories"("id") ON DELETE SET NULL;