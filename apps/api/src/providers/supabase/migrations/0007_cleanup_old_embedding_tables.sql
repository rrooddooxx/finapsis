-- WARNING: This migration should only be run after confirming the universal embeddings system is working correctly
-- Run this migration manually after testing, not automatically

-- Drop old embedding tables (commented out for safety)
-- Uncomment these lines only after confirming the new system works

-- DROP INDEX IF EXISTS "personalEmbeddingIndex";
-- DROP INDEX IF EXISTS "personalUserIndex";
-- DROP INDEX IF EXISTS "generalEmbeddingIndex";
-- DROP INDEX IF EXISTS "generalCategoryIndex";
-- DROP INDEX IF EXISTS "generalKnowledgeCategoryIndex";

-- DROP TABLE IF EXISTS "personal_embeddings";
-- DROP TABLE IF EXISTS "general_financial_embeddings";

-- Add comments to document the transition
COMMENT ON TABLE "embeddings" IS 'Universal embeddings table that replaced personal_embeddings and general_financial_embeddings for better consistency and performance';

-- Verify data integrity
-- SELECT 
--     entity_type, 
--     COUNT(*) as count,
--     MIN(created_at) as first_created,
--     MAX(created_at) as last_created
-- FROM embeddings 
-- GROUP BY entity_type
-- ORDER BY entity_type;