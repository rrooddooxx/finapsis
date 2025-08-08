import {z} from "zod";

const financialCategoryEnum = z.enum(["ahorro", "credito", "presupuesto", "inversiones", "deudas", "general"]);

export const GetGeneralKnowledgeSchema = z.object({
    question: z.string().describe('la pregunta del usuario sobre finanzas para buscar en la base de conocimientos general'),
    category: financialCategoryEnum.optional().describe('categoría opcional para filtrar la búsqueda: ahorro, credito, presupuesto, inversiones, deudas, general')
})

export type GetGeneralKnowledgeParams = z.infer<typeof GetGeneralKnowledgeSchema>;