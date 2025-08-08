-- Create universal embeddings table
CREATE TABLE IF NOT EXISTS "embeddings" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(191) NOT NULL,
	"user_id" varchar(191),
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS "embeddingsVectorIndex" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "embeddingsUserIndex" ON "embeddings" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "embeddingsEntityTypeIndex" ON "embeddings" USING btree ("entity_type");
CREATE INDEX IF NOT EXISTS "embeddingsEntityIndex" ON "embeddings" USING btree ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "embeddingsUserEntityIndex" ON "embeddings" USING btree ("user_id", "entity_type");

-- Create GIN index for metadata jsonb queries
CREATE INDEX IF NOT EXISTS "embeddingsMetadataIndex" ON "embeddings" USING gin ("metadata");