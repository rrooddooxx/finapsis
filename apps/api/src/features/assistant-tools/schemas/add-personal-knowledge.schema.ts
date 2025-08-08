import {z} from "zod";

export const AddPersonalKnowledgeSchema = z.object({
    content: z.string().describe('el contenido o recurso a agregar a la base de conocimientos'),
    userId: z.string().describe('ID del usuario para asociar el conocimiento'),
})

export type AddPersonalKnowledgeParams = z.infer<typeof AddPersonalKnowledgeSchema>;