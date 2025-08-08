import { createPersonalKnowledge } from "./actions/personal-knowledge";
import { generateEmbedding, generateEmbeddings, getPersonalKnowledge, searchGeneralFinancialKnowledge } from "./services/embedding.service";

export enum RetrievalService {
    GENERATE_EMBEDDING = 'GENERATE_EMBEDDING',
    GENERATE_EMBEDDINGS = 'GENERATE_EMBEDDINGS',
    CREATE_PERSONAL_KNOWLEDGE = 'CREATE_PERSONAL_KNOWLEDGE',
    GET_PERSONAL_KNOWLEDGE = 'GET_PERSONAL_KNOWLEDGE',
    GET_GENERAL_KNOWLEDGE = 'GET_GENERAL_KNOWLEDGE',
}

export const RetrievalModule = {
    [RetrievalService.GENERATE_EMBEDDING]: generateEmbedding,
    [RetrievalService.GENERATE_EMBEDDINGS]: generateEmbeddings,
    [RetrievalService.CREATE_PERSONAL_KNOWLEDGE]: createPersonalKnowledge,
    [RetrievalService.GET_PERSONAL_KNOWLEDGE]: getPersonalKnowledge,
    [RetrievalService.GET_GENERAL_KNOWLEDGE]: searchGeneralFinancialKnowledge,
}
