export interface EmbeddingResult {
    content: string;
    embedding: number[];
}

export interface SimilaritySearchResult {
    content: string;
    similarity: number;
}

export interface ResourceCreationResult {
    success: boolean;
    message: string;
    resourceId?: string;
}

export interface EmbeddingService {
    generateEmbedding(value: string): Promise<number[]>;
    generateEmbeddings(value: string): Promise<EmbeddingResult[]>;
    findRelevantContent(query: string, limit?: number, threshold?: number): Promise<SimilaritySearchResult[]>;
}

export interface ResourceService {
    createResource(content: string): Promise<string>;
}