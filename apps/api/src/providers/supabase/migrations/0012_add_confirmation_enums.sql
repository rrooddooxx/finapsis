-- Migration: Add confirmation-related enum values
-- Description: Add PENDING_CONFIRMATION status and USER_CONFIRMATION, CONFIRMATION_PROCESSING stages

DO $$
BEGIN
    -- Add PENDING_CONFIRMATION to processing_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_CONFIRMATION' AND enumtypid = 'public.processing_status'::regtype) THEN
        ALTER TYPE "public"."processing_status" ADD VALUE 'PENDING_CONFIRMATION';
    END IF;
    
    -- Add USER_CONFIRMATION to processing_stage enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER_CONFIRMATION' AND enumtypid = 'public.processing_stage'::regtype) THEN
        ALTER TYPE "public"."processing_stage" ADD VALUE 'USER_CONFIRMATION';
    END IF;
    
    -- Add CONFIRMATION_PROCESSING to processing_stage enum  
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONFIRMATION_PROCESSING' AND enumtypid = 'public.processing_stage'::regtype) THEN
        ALTER TYPE "public"."processing_stage" ADD VALUE 'CONFIRMATION_PROCESSING';
    END IF;
END
$$;