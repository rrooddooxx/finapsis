import {z} from "zod";

export const EmbeddingQuerySchema = z.object({
    query: z.string().min(1).describe('The query text to search for in the knowledge base'),
    limit: z.number().min(1).max(20).optional().default(4).describe('Maximum number of results to return'),
    threshold: z.number().min(0).max(1).optional().default(0.5).describe('Minimum similarity threshold for results'),
})

export const CreateResourceSchema = z.object({
    content: z.string().min(1).describe('The content to add to the knowledge base'),
})

export const GenerateEmbeddingSchema = z.object({
    value: z.string().min(1).describe('The text value to generate embedding for'),
})

export type EmbeddingQueryParams = z.infer<typeof EmbeddingQuerySchema>;
export type CreateResourceParams = z.infer<typeof CreateResourceSchema>;
export type GenerateEmbeddingParams = z.infer<typeof GenerateEmbeddingSchema>;