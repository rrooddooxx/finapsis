-- Create general_financial_knowledge table
CREATE TABLE IF NOT EXISTS "general_financial_knowledge" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"source" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create general_financial_embeddings table
CREATE TABLE IF NOT EXISTS "general_financial_embeddings" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"knowledge_id" varchar(191),
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "general_financial_embeddings" ADD CONSTRAINT "general_financial_embeddings_knowledge_id_general_financial_knowledge_id_fk" FOREIGN KEY ("knowledge_id") REFERENCES "public"."general_financial_knowledge"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create vector similarity index for embeddings
CREATE INDEX IF NOT EXISTS "generalEmbeddingIndex" ON "general_financial_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- Create category index for filtered searches
CREATE INDEX IF NOT EXISTS "generalCategoryIndex" ON "general_financial_embeddings" USING btree ("category");

-- Create category index on knowledge table too
CREATE INDEX IF NOT EXISTS "generalKnowledgeCategoryIndex" ON "general_financial_knowledge" USING btree ("category");