import { createResource } from "./actions/resources";
import { generateEmbedding, generateEmbeddings, findRelevantContent } from "./services/embedding.service";

export enum RetrievalService {
    CREATE_RESOURCE = 'CREATE_RESOURCE',
    GENERATE_EMBEDDING = 'GENERATE_EMBEDDING',
    GENERATE_EMBEDDINGS = 'GENERATE_EMBEDDINGS',
    FIND_RELEVANT_CONTENT = 'FIND_RELEVANT_CONTENT',
}

export const RetrievalModule = {
    [RetrievalService.CREATE_RESOURCE]: createResource,
    [RetrievalService.GENERATE_EMBEDDING]: generateEmbedding,
    [RetrievalService.GENERATE_EMBEDDINGS]: generateEmbeddings,
    [RetrievalService.FIND_RELEVANT_CONTENT]: findRelevantContent,
}