-- Renombrar tablas para reflejar concepto de conocimiento personal
ALTER TABLE "resources" RENAME TO "personal_knowledge";
ALTER TABLE "embeddings" RENAME TO "personal_embeddings";

-- Renombrar columna de referencia en personal_embeddings
ALTER TABLE "personal_embeddings" 
RENAME COLUMN "resource_id" TO "personal_knowledge_id";

-- Renombrar índices para reflejar nuevos nombres
DROP INDEX IF EXISTS "embeddingIndex";
DROP INDEX IF EXISTS "userIndex";

CREATE INDEX IF NOT EXISTS "personalEmbeddingIndex" ON "personal_embeddings" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "personalUserIndex" ON "personal_embeddings" USING btree ("user_id");