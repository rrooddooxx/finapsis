import {tool} from "ai";
import {z} from "zod";
import {RetrievalModule, RetrievalService} from "../../assistant-retrieval/retrieval.module";

export const getKnowledgeTool = tool({
    description: `OBLIGATORIO: Buscar en tu base de conocimientos información relevante antes de responder CUALQUIER pregunta del usuario. Esta herramienta debe usarse primero para cada consulta del usuario para encontrar información personal y financiera almacenada.`,
    inputSchema: z.object({
        question: z.string().describe('la pregunta exacta del usuario para buscar en la base de conocimientos'),
    }),
    execute: async ({question}) => RetrievalModule[RetrievalService.FIND_RELEVANT_CONTENT](question),
})
