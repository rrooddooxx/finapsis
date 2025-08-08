-- Migration: Add PROCESSING_VISION to processing_status enum and VISION_ANALYSIS to processing_stage enum
-- Description: Add missing enum values for vision processing

ALTER TYPE "public"."processing_status" ADD VALUE 'PROCESSING_VISION';
ALTER TYPE "public"."processing_stage" ADD VALUE 'VISION_ANALYSIS';