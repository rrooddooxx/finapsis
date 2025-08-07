import {openai} from "@ai-sdk/openai";
import {embed, embedMany} from "ai";
import {cosineDistance, desc, gt, sql} from "drizzle-orm";
import {embeddings} from "../../../providers/supabase/schema/embeddings";
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

export const findRelevantContent = async (userQuery: string) => {
    const userQueryEmbedded = await generateEmbedding(userQuery);
    const similarity = sql<number>`1 - (
    ${cosineDistance(
            embeddings.embedding,
            userQueryEmbedded,
    )}
    )`;

    return supabase.select({content: embeddings.content, similarity})
        .from(embeddings)
        .where(gt(similarity, 0.5))
        .orderBy(desc(similarity))
        .limit(4);
}
