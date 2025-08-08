import {tool} from "ai";
import {GetPersonalKnowledgeParams, GetPersonalKnowledgeSchema} from "../schemas/get-personal-knowledge.schema";
import {RetrievalModule, RetrievalService} from "../../assistant-retrieval/retrieval.module";
import {devLogger} from "../../../utils/logger.utils";
import {AssistantTool} from "../tools.module";
import {HTTPException} from "hono/http-exception";

const getPersonalKnowledgeAction = async ({question, userId}: GetPersonalKnowledgeParams) => {
    devLogger("Tool Called!!", `Tool: ${AssistantTool.GET_PERSONAL_KNOWLEDGE} | Params: userId=${userId}, question=${question.substring(0, 50)}...`)
    const result = await RetrievalModule[RetrievalService.GET_PERSONAL_KNOWLEDGE](question, userId);
    if (!result) throw new HTTPException(500, {message: `Error from tool: ${AssistantTool.GET_PERSONAL_KNOWLEDGE}`})
    return result;
}

export const getPersonalKnowledgeTool = tool({
    description: `OBLIGATORIO: Buscar en la base de conocimientos personal del usuario información relevante antes de responder CUALQUIER pregunta. Esta herramienta debe usarse primero para cada consulta del usuario para encontrar información personal y financiera almacenada.`,
    inputSchema: GetPersonalKnowledgeSchema,
    execute: getPersonalKnowledgeAction,
})
