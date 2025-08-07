-- Migrate existing personal_embeddings to universal embeddings table
INSERT INTO "embeddings" (
    "id",
    "entity_type", 
    "entity_id",
    "user_id",
    "content",
    "embedding",
    "metadata",
    "created_at"
)
SELECT 
    pe."id",
    'personal_knowledge' as "entity_type",
    pe."personal_knowledge_id" as "entity_id", 
    pe."user_id",
    pe."content",
    pe."embedding",
    '{"type": "personal_knowledge"}'::jsonb as "metadata",
    now() as "created_at"
FROM "personal_embeddings" pe;

-- Migrate existing general_financial_embeddings to universal embeddings table
INSERT INTO "embeddings" (
    "id",
    "entity_type",
    "entity_id", 
    "user_id",
    "content",
    "embedding",
    "metadata",
    "created_at"
)
SELECT 
    CONCAT(gfe."id", '_general') as "id", -- Ensure unique IDs
    'general_financial_knowledge' as "entity_type",
    gfe."knowledge_id" as "entity_id",
    NULL as "user_id", -- General knowledge has no specific user
    gfe."content",
    gfe."embedding", 
    jsonb_build_object(
        'type', 'general_financial',
        'category', gfe."category"
    ) as "metadata",
    now() as "created_at"
FROM "general_financial_embeddings" gfe;

-- Add comments for documentation
COMMENT ON TABLE "embeddings" IS 'Universal embeddings table for all types of content (personal knowledge, financial goals, general knowledge)';
COMMENT ON COLUMN "embeddings"."entity_type" IS 'Type of entity: personal_knowledge, personal_financial_goals, general_financial_knowledge';
COMMENT ON COLUMN "embeddings"."entity_id" IS 'ID of the related entity in its respective table';
COMMENT ON COLUMN "embeddings"."user_id" IS 'User ID for personal content, NULL for general knowledge';
COMMENT ON COLUMN "embeddings"."metadata" IS 'Flexible JSONB field for entity-specific data like categories, status, etc';