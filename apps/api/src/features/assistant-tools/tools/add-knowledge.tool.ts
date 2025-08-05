import {tool} from "ai";
import {RetrievalModule, RetrievalService} from "../../assistant-retrieval/retrieval.module";
import {z} from "zod";

export const addKnowledgeTool = tool({
    description: `Agregar un recurso a tu base de conocimientos.
                Si el usuario proporciona información espontáneamente, úsala sin pedir confirmación.`,
    inputSchema: z.object({
        content: z.string().describe('el contenido o recurso a agregar a la base de conocimientos'),
    }),
    execute: async ({content}) => RetrievalModule[RetrievalService.CREATE_RESOURCE]({content}),
})
