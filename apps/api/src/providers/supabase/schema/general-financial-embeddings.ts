import { index, pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { nanoid } from "../utils";
import { generalFinancialKnowledge } from "./general-financial-knowledge";

export const generalFinancialEmbeddings = pgTable(
    'general_financial_embeddings',
    {
        id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
        knowledgeId: varchar('knowledge_id', { length: 191 }).references(() => generalFinancialKnowledge.id, { onDelete: 'cascade' }),
        content: text('content').notNull(),
        embedding: vector('embedding', { dimensions: 1536 }).notNull(),
        category: varchar('category', { length: 50 }).default('general').notNull(),
    },
    table => ({
        embeddingIndex: index('generalEmbeddingIndex')
            .using('hnsw', table.embedding.op('vector_cosine_ops')),
        categoryIndex: index('generalCategoryIndex').on(table.category)
    }),
);