-- Migration: Safely add missing enum values
-- Description: Add VISION_ANALYSIS and PROCESSING_VISION to their respective enums if they don't already exist.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VISION_ANALYSIS' AND enumtypid = 'public.processing_stage'::regtype) THEN
        ALTER TYPE "public"."processing_stage" ADD VALUE 'VISION_ANALYSIS';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PROCESSING_VISION' AND enumtypid = 'public.processing_status'::regtype) THEN
        ALTER TYPE "public"."processing_status" ADD VALUE 'PROCESSING_VISION';
    END IF;
END
$$;