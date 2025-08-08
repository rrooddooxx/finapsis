import {z} from "zod";

export const GetPersonalKnowledgeSchema = z.object({
    question: z.string().describe('la pregunta exacta del usuario para buscar en la base de conocimientos'),
    userId: z.string().describe('ID del usuario para filtrar la búsqueda')
})

export type GetPersonalKnowledgeParams = z.infer<typeof GetPersonalKnowledgeSchema>;