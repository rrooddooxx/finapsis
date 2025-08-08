export type PersonalKnowledgeItem = {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
    relevanceScore?: number;
}

export type GetPersonalKnowledgeResponse = {
    results: PersonalKnowledgeItem[];
    totalCount: number;
    searchQuery: string;
}