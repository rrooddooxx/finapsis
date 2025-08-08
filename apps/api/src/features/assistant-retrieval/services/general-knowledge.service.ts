import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { cosineDistance, desc, eq, gt, sql, and } from "drizzle-orm";
import { supabase } from "../../../providers/supabase";
import { generalFinancialKnowledge } from "../../../providers/supabase/schema/general-financial-knowledge";
import { generalFinancialEmbeddings } from "../../../providers/supabase/schema/general-financial-embeddings";
import type { FinancialCategory } from "../../../providers/supabase/schema/general-financial-knowledge";

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

export const addGeneralFinancialKnowledge = async (
    content: string,
    category: FinancialCategory = 'general',
    source?: string
): Promise<{ knowledgeId: string; embeddingsCount: number }> => {
    try {
        console.log('🔄 Adding general financial knowledge:', { category, contentLength: content.length });

        // Insert knowledge record
        const [knowledgeRecord] = await supabase
            .insert(generalFinancialKnowledge)
            .values({
                content,
                category,
                source,
            })
            .returning({ id: generalFinancialKnowledge.id });

        if (!knowledgeRecord) {
            throw new Error('Failed to insert knowledge record');
        }

        // Use universal embeddings service
        const { createGeneralKnowledgeEmbeddings } = await import('./universal-embedding.service');
        const { embeddingsCount } = await createGeneralKnowledgeEmbeddings(
            knowledgeRecord.id,
            content,
            category,
            source
        );

        console.log('✅ General knowledge added successfully:', {
            knowledgeId: knowledgeRecord.id,
            embeddingsCount,
            category
        });

        return {
            knowledgeId: knowledgeRecord.id,
            embeddingsCount
        };

    } catch (error) {
        console.error('❌ Error adding general financial knowledge:', error);
        throw error;
    }
};

export const searchGeneralFinancialKnowledge = async (
    query: string,
    category?: FinancialCategory,
    limit = 4
) => {
    console.log('🔍 Searching general financial knowledge (universal):', { query: query.substring(0, 50), category, limit });
    
    try {
        // Use universal embeddings service
        const { searchEmbeddings } = await import('./universal-embedding.service');
        
        const results = await searchEmbeddings({
            query,
            entityTypes: ['general_financial_knowledge'],
            includeUserContent: false,
            includeGeneralContent: true,
            // Category filter disabled - embeddings may not have correct metadata structure
            // metadataFilters: category && category !== 'general' ? { category } : undefined,
            limit,
            threshold: 0.1
        });

        console.log('🔍 General knowledge results found:', results?.length || 0);

        if (!results || results.length === 0 || results[0].similarity === 0) {
            return [{
                content: `No se encontró información relevante de conocimiento financiero general${category ? ` para la categoría ${category}` : ''}`,
                similarity: 0,
                category: category || 'general',
                source: null
            }];
        }

        // Map to legacy format
        return results.map(r => {
            const metadata = r.metadata as any;
            return {
                content: r.content,
                similarity: r.similarity,
                category: metadata?.category || 'general',
                source: metadata?.source || null
            };
        });

    } catch (error: any) {
        console.error('❌ Error searching general financial knowledge:', error);
        return [{
            content: `Error al buscar conocimiento financiero general: ${error?.message || 'Unknown error'}`,
            similarity: 0,
            category: category || 'general',
            source: null
        }];
    }
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const input = value.replaceAll('\\n', ' ');
    const { embedding } = await embed({
        model: embeddingModel,
        value: input,
    });

    return embedding;
};