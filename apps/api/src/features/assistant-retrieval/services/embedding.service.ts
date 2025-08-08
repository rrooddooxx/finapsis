import {openai} from "@ai-sdk/openai";
import {embed, embedMany} from "ai";
import {cosineDistance, desc, eq, gt, sql} from "drizzle-orm";
import {personalEmbeddings} from "../../../providers/supabase/schema/personal-embeddings";
import {supabase} from "../../../providers/supabase";

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

export const generateEmbeddings = async (value: string):
    Promise<Array<{ embedding: number[]; content: string }>> => {
    const chunks = generateChunks(value);
    const {embeddings} = await embedMany({
        model: embeddingModel,
        values: chunks,
    });
    return embeddings.map((e, i) => ({content: chunks[i], embedding: e}))
}

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const {embedding} = await embed({
        model: embeddingModel,
        value: input,
    });

    return embedding;
}

export const getPersonalKnowledge = async (userQuery: string, userId: string) => {
    console.log('🔍 getPersonalKnowledge (universal) llamado con:', {userQuery: userQuery.substring(0, 50), userId});
    
    try {
        // Use universal embeddings service
        const { searchEmbeddings } = await import('./universal-embedding.service');
        
        const results = await searchEmbeddings({
            query: userQuery,
            entityTypes: ['personal_knowledge'],
            userId,
            includeUserContent: true,
            includeGeneralContent: false,
            limit: 4,
            threshold: 0.5
        });

        console.log('🔍 Resultados universales encontrados:', results?.length || 0);

        if (!results || results.length === 0 || results[0].similarity === 0) {
            return [{content: `No se encontró información relevante para el usuario ${userId}`, similarity: 0}];
        }

        // Map to legacy format for backwards compatibility
        return results.map(r => ({
            content: r.content,
            similarity: r.similarity
        }));

    } catch (error: any) {
        console.error('❌ Error en getPersonalKnowledge:', error);
        return [{content: `Error al buscar información: ${error?.message || 'Unknown error'}`, similarity: 0}];
    }
}

// Import general knowledge search function
export { searchGeneralFinancialKnowledge } from './general-knowledge.service';

// Import the new universal search function
export { searchAllFinancialKnowledge, searchEmbeddings } from './universal-embedding.service';

// Updated combined search function using universal embeddings
export const getCombinedFinancialKnowledge = async (
    userQuery: string, 
    userId: string,
    options: {
        personalLimit?: number;
        generalLimit?: number;
        goalsLimit?: number;
        category?: string;
        includePersonal?: boolean;
        includeGeneral?: boolean;
        includeGoals?: boolean;
    } = {}
) => {
    const {
        personalLimit = 2,
        generalLimit = 3,
        goalsLimit = 2,
        category,
        includePersonal = true,
        includeGeneral = true,
        includeGoals = true
    } = options;

    console.log('🔍 getCombinedFinancialKnowledge (universal) called:', { 
        query: userQuery.substring(0, 50), 
        userId, 
        options 
    });

    try {
        // Use the new universal search function
        const { searchAllFinancialKnowledge } = await import('./universal-embedding.service');
        
        const results = await searchAllFinancialKnowledge(
            userQuery,
            userId,
            {
                personalLimit: includePersonal ? personalLimit : 0,
                generalLimit: includeGeneral ? generalLimit : 0,
                goalsLimit: includeGoals ? goalsLimit : 0,
                category
            }
        );

        // Map to legacy format for backwards compatibility
        return results.map(r => ({
            content: r.content,
            similarity: r.similarity,
            type: r.entityType === 'personal_knowledge' ? 'personal' :
                  r.entityType === 'personal_financial_goals' ? 'goals' :
                  r.entityType === 'general_financial_knowledge' ? 'general' : 'unknown',
            entityType: r.entityType,
            entityId: r.entityId,
            metadata: r.metadata
        }));

    } catch (error: any) {
        console.error('❌ Error en getCombinedFinancialKnowledge:', error);
        return [{
            content: `Error al buscar información financiera: ${error?.message || 'Unknown error'}`,
            similarity: 0,
            type: 'error'
        }];
    }
};

// Alias para compatibilidad hacia atrás
export const findRelevantContent = getPersonalKnowledge;
