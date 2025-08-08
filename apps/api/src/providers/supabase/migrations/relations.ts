import { relations } from "drizzle-orm/relations";
import { personal_knowledge, personal_embeddings, general_financial_knowledge, general_financial_embeddings } from "./schema";

export const personal_embeddingsRelations = relations(personal_embeddings, ({one}) => ({
	personal_knowledge: one(personal_knowledge, {
		fields: [personal_embeddings.personal_knowledge_id],
		references: [personal_knowledge.id]
	}),
}));

export const personal_knowledgeRelations = relations(personal_knowledge, ({many}) => ({
	personal_embeddings: many(personal_embeddings),
}));

export const general_financial_embeddingsRelations = relations(general_financial_embeddings, ({one}) => ({
	general_financial_knowledge: one(general_financial_knowledge, {
		fields: [general_financial_embeddings.knowledge_id],
		references: [general_financial_knowledge.id]
	}),
}));

export const general_financial_knowledgeRelations = relations(general_financial_knowledge, ({many}) => ({
	general_financial_embeddings: many(general_financial_embeddings),
}));