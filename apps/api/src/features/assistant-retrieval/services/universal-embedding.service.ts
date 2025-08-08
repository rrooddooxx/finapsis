import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { cosineDistance, desc, eq, gt, sql, and, or } from "drizzle-orm";
import { supabase } from "../../../providers/supabase";
import { embeddings, type EntityType, type EmbeddingMetadata } from "../../../providers/supabase/schema/embeddings";

const embeddingModel = openai.embedding('text-embedding-ada-002');

const generateChunks = (input: string): string[] => {
    const text = input.trim();

    if (text.length < 200) {
        return [text];
    }

    const sentences = text
        .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/)
        .filter(sentence => sentence.trim().length > 0)
        .map(sentence => sentence.trim());

    if (sentences.length === 1) {
        return text
            .split(/,\s+/)
            .filter(chunk => chunk.trim().length > 10)
            .map(chunk => chunk.trim());
    }

    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length === 0) {
            currentChunk = sentence;
        } else if (currentChunk.length + sentence.length < 300) {
            currentChunk += ' ' + sentence;
        } else {
            chunks.push(currentChunk);
            currentChunk = sentence;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks.filter(chunk => chunk.length > 0);
}

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });

    return embedding;
};

// Universal function to create embeddings for any entity type
export const createEmbeddings = async (
    entityType: EntityType,
    entityId: string,
    content: string,
    userId?: string,
    metadata?: EmbeddingMetadata
): Promise<{ embeddingsCount: number }> => {
    try {
        console.log('🔄 Creating universal embeddings:', { entityType, entityId, userId, contentLength: content.length });

        // Generate chunks and embeddings
        const chunks = generateChunks(content);
        console.log('📝 Generated chunks:', { chunksCount: chunks.length, chunks: chunks.map(c => c.substring(0, 50)) });
        
        console.log('🔄 Calling OpenAI embedMany API...');
        const { embeddings: embeddingVectors } = await embedMany({
            model: embeddingModel,
            values: chunks,
        });
        console.log('✅ OpenAI embedMany completed:', { embeddingVectorsCount: embeddingVectors.length });

        // Insert embeddings
        const embeddingRecords = embeddingVectors.map((embedding, index) => ({
            entityType,
            entityId,
            userId: userId || null,
            content: chunks[index],
            embedding,
            metadata: metadata || null,
        }));

        console.log('🔄 Inserting embeddings to database...');
        await supabase
            .insert(embeddings)
            .values(embeddingRecords);
        console.log('✅ Database insertion completed');

        console.log('✅ Universal embeddings created:', {
            entityType,
            entityId,
            embeddingsCount: embeddingVectors.length
        });

        return {
            embeddingsCount: embeddingVectors.length
        };

    } catch (error: any) {
        console.error('❌ Error creating universal embeddings:', error);
        throw error;
    }
};

// Universal search function with flexible filtering
export interface SearchEmbeddingsOptions {
    query: string;
    entityTypes?: EntityType[];
    userId?: string;
    includeUserContent?: boolean;
    includeGeneralContent?: boolean;
    metadataFilters?: Record<string, any>;
    limit?: number;
    threshold?: number;
}

export const searchEmbeddings = async (options: SearchEmbeddingsOptions) => {
    const {
        query,
        entityTypes,
        userId,
        includeUserContent = true,
        includeGeneralContent = true,
        metadataFilters,
        limit = 5,
        threshold = 0.1
    } = options;

    console.log('🔍 Searching universal embeddings:', { 
        query: query.substring(0, 50), 
        entityTypes, 
        userId,
        includeUserContent,
        includeGeneralContent,
        limit 
    });
    
    try {
        const queryEmbedding = await generateEmbedding(query);
        
        const similarity = sql<number>`1 - (
            ${cosineDistance(
                embeddings.embedding,
                queryEmbedding,
            )}
        )`;

        // Build where conditions - use low threshold to find more results
        const whereConditions = [gt(similarity, threshold)];

        // Entity type filter
        if (entityTypes && entityTypes.length > 0) {
            if (entityTypes.length === 1) {
                whereConditions.push(eq(embeddings.entityType, entityTypes[0]));
            } else {
                whereConditions.push(
                    or(...entityTypes.map(type => eq(embeddings.entityType, type)))!
                );
            }
        }

        // User content filter
        const userConditions = [];
        if (includeUserContent && userId) {
            userConditions.push(eq(embeddings.userId, userId));
        }
        if (includeGeneralContent) {
            userConditions.push(sql`${embeddings.userId} IS NULL`);
        }

        if (userConditions.length > 0) {
            whereConditions.push(or(...userConditions)!);
        }

        // Metadata filters
        if (metadataFilters) {
            Object.entries(metadataFilters).forEach(([key, value]) => {
                whereConditions.push(
                    sql`${embeddings.metadata}->>${key} = ${value}`
                );
            });
        }

        const results = await supabase
            .select({
                content: embeddings.content,
                similarity,
                entityType: embeddings.entityType,
                entityId: embeddings.entityId,
                userId: embeddings.userId,
                metadata: embeddings.metadata,
            })
            .from(embeddings)
            .where(and(...whereConditions)!)
            .orderBy(desc(similarity))
            .limit(limit);

        console.log('🔍 Universal embeddings results found:', results?.length || 0);

        if (!results || results.length === 0) {
            return [{
                content: `No se encontró información relevante para la consulta`,
                similarity: 0,
                entityType: 'none' as EntityType,
                entityId: '',
                userId: null,
                metadata: null
            }];
        }

        return results;
    } catch (error: any) {
        console.error('❌ Error searching universal embeddings:', error);
        return [{
            content: `Error al buscar información: ${error?.message || 'Unknown error'}`,
            similarity: 0,
            entityType: 'error' as any,
            entityId: '',
            userId: null,
            metadata: null
        }];
    }
};

// Convenience functions for specific entity types
export const createPersonalKnowledgeEmbeddings = (
    knowledgeId: string,
    content: string,
    userId: string
) => createEmbeddings(
    'personal_knowledge',
    knowledgeId,
    content,
    userId,
    { type: 'personal_knowledge' }
);

export const createPersonalGoalEmbeddings = (
    goalId: string,
    content: string,
    userId: string,
    goalType: string,
    status: 'active' | 'completed' | 'paused' | 'cancelled' = 'active',
    targetAmount?: number
) => createEmbeddings(
    'personal_financial_goals',
    goalId,
    content,
    userId,
    { type: 'personal_goal', goal_type: goalType, status, target_amount: targetAmount }
);

export const createGeneralKnowledgeEmbeddings = (
    knowledgeId: string,
    content: string,
    category: 'ahorro' | 'credito' | 'presupuesto' | 'inversiones' | 'deudas' | 'general' = 'general',
    source?: string
) => createEmbeddings(
    'general_financial_knowledge',
    knowledgeId,
    content,
    undefined,
    { type: 'general_financial', category, source }
);

// Combined search for all types of financial knowledge
export const searchAllFinancialKnowledge = async (
    query: string,
    userId: string,
    options: {
        personalLimit?: number;
        generalLimit?: number;
        goalsLimit?: number;
        category?: string;
    } = {}
) => {
    const {
        personalLimit = 2,
        generalLimit = 3,
        goalsLimit = 2,
        category
    } = options;

    console.log('🔍 Searching all financial knowledge:', { 
        query: query.substring(0, 50), 
        userId, 
        options 
    });

    try {
        const results = await Promise.all([
            // Search personal knowledge
            searchEmbeddings({
                query,
                entityTypes: ['personal_knowledge'],
                userId,
                includeUserContent: true,
                includeGeneralContent: false,
                limit: personalLimit
            }),
            
            // Search personal goals
            searchEmbeddings({
                query,
                entityTypes: ['personal_financial_goals'],
                userId,
                includeUserContent: true,
                includeGeneralContent: false,
                limit: goalsLimit
            }),

            // Search general knowledge with optional category filter
            searchEmbeddings({
                query,
                entityTypes: ['general_financial_knowledge'],
                includeUserContent: false,
                includeGeneralContent: true,
                metadataFilters: category ? { category } : undefined,
                limit: generalLimit
            })
        ]);

        // Flatten and sort by similarity
        const allResults = results
            .flat()
            .filter(r => r.similarity > 0.5)
            .sort((a, b) => b.similarity - a.similarity);

        console.log('🔍 Combined results found:', {
            total: allResults.length,
            personal: allResults.filter(r => r.entityType === 'personal_knowledge').length,
            goals: allResults.filter(r => r.entityType === 'personal_financial_goals').length,
            general: allResults.filter(r => r.entityType === 'general_financial_knowledge').length
        });

        return allResults;

    } catch (error: any) {
        console.error('❌ Error searching all financial knowledge:', error);
        return [{
            content: `Error al buscar información financiera: ${error?.message || 'Unknown error'}`,
            similarity: 0,
            entityType: 'error' as any,
            entityId: '',
            userId: null,
            metadata: null
        }];
    }
};