import {tool} from "ai";
import {GetGeneralKnowledgeParams, GetGeneralKnowledgeSchema} from "../schemas/get-general-knowledge.schema";
import {RetrievalModule, RetrievalService} from "../../assistant-retrieval/retrieval.module";
import {devLogger} from "../../../utils/logger.utils";
import {AssistantTool} from "../tools.module";
import {HTTPException} from "hono/http-exception";

const getGeneralKnowledgeAction = async ({question, category}: GetGeneralKnowledgeParams) => {
    devLogger("Tool Called!!", `Tool: ${AssistantTool.GET_GENERAL_KNOWLEDGE} | Params: question=${question.substring(0, 50)}..., category=${category || 'all'}`)
    const result = await RetrievalModule[RetrievalService.GET_GENERAL_KNOWLEDGE](question, category);
    if (!result) throw new HTTPException(500, {message: `Error from tool: ${AssistantTool.GET_GENERAL_KNOWLEDGE}`})
    return result;
}

export const getGeneralKnowledgeTool = tool({
    description: `Buscar en la base de conocimientos financieros generales información relevante sobre finanzas. Úsalo para consultas sobre conceptos financieros, leyes, deudas, procedimientos bancarios, inversiones, ahorro, etc. No requiere información personal del usuario.`,
    inputSchema: GetGeneralKnowledgeSchema,
    execute: getGeneralKnowledgeAction,
})