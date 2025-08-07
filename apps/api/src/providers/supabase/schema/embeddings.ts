import { sql } from "drizzle-orm";
import { index, pgTable, text, varchar, vector, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

import { nanoid } from "../utils";

export const embeddings = pgTable(
    'embeddings',
    {
        id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
        entityType: varchar('entity_type', { length: 50 }).notNull(),
        entityId: varchar('entity_id', { length: 191 }).notNull(),
        userId: varchar('user_id', { length: 191 }), // NULL for general knowledge
        content: text('content').notNull(),
        embedding: vector('embedding', { dimensions: 1536 }).notNull(),
        metadata: jsonb('metadata'), // Flexible field for categories and other data
        createdAt: timestamp('created_at').notNull().default(sql`now()`),
    },
    table => ({
        vectorIndex: index('embeddingsVectorIndex')
            .using('hnsw', table.embedding.op('vector_cosine_ops')),
        userIndex: index('embeddingsUserIndex').on(table.userId),
        entityTypeIndex: index('embeddingsEntityTypeIndex').on(table.entityType),
        entityIndex: index('embeddingsEntityIndex').on(table.entityType, table.entityId),
        userEntityIndex: index('embeddingsUserEntityIndex').on(table.userId, table.entityType),
        metadataIndex: index('embeddingsMetadataIndex').using('gin', table.metadata)
    }),
);

// Entity types enum for validation
export const entityTypeEnum = z.enum([
    'personal_knowledge',
    'personal_financial_goals', 
    'general_financial_knowledge'
]);

export type EntityType = z.infer<typeof entityTypeEnum>;

// Schema for inserting embeddings (manual Zod schema)
export const insertEmbeddingSchema = z.object({
    entityType: entityTypeEnum,
    entityId: z.string().min(1, "Entity ID is required"),
    userId: z.string().optional(),
    content: z.string().min(1, "Content is required"),
    embedding: z.array(z.number()).length(1536, "Embedding must have exactly 1536 dimensions"),
    metadata: z.record(z.any()).optional(),
});

// Type for embedding insertion
export type NewEmbeddingParams = z.infer<typeof insertEmbeddingSchema>;

// Common metadata schemas for different entity types
export const personalKnowledgeMetadataSchema = z.object({
    type: z.literal('personal_knowledge').default('personal_knowledge'),
    category: z.string().optional(),
});

export const personalGoalMetadataSchema = z.object({
    type: z.literal('personal_goal').default('personal_goal'),
    goal_type: z.string(),
    status: z.enum(['active', 'completed', 'paused', 'cancelled']).default('active'),
    target_amount: z.number().optional(),
});

export const generalKnowledgeMetadataSchema = z.object({
    type: z.literal('general_financial').default('general_financial'),
    category: z.enum(['ahorro', 'credito', 'presupuesto', 'inversiones', 'deudas', 'general']).default('general'),
    source: z.string().optional(),
});

// Union type for all metadata schemas
export const embeddingMetadataSchema = z.union([
    personalKnowledgeMetadataSchema,
    personalGoalMetadataSchema,
    generalKnowledgeMetadataSchema,
]);

export type EmbeddingMetadata = z.infer<typeof embeddingMetadataSchema>;