-- Migration: Add VISION_ANALYSIS to processing_stage enum
-- Description: Safely add a new value to the processing_stage enum to avoid conflicts.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VISION_ANALYSIS' AND enumtypid = 'public.processing_stage'::regtype) THEN
        ALTER TYPE "public"."processing_stage" ADD VALUE 'VISION_ANALYSIS';
    END IF;
END
$$;