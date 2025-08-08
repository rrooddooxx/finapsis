import {index, pgTable, text, varchar, vector} from "drizzle-orm/pg-core";
import {nanoid} from "../utils";
import {personalKnowledge} from "./personal-knowledge";


export const personalEmbeddings = pgTable(
    'personal_embeddings',
    {
        id: varchar('id', {length: 191}).primaryKey().$defaultFn(() => nanoid()),
        personalKnowledgeId: varchar('personal_knowledge_id', {length: 191}).references(() => personalKnowledge.id, {onDelete: 'cascade'}),
        userId: varchar('user_id', {length: 191}).notNull(),
        content: text('content').notNull(),
        embedding: vector('embedding', {dimensions: 1536}).notNull(),
    },
    table => ({
        embeddingIndex: index('personalEmbeddingIndex')
            .using('hnsw', table.embedding.op('vector_cosine_ops')),
        userIndex: index('personalUserIndex').on(table.userId)
    }),
);
