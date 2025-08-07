import {tool} from "ai";
import {AddPersonalKnowledgeParams, AddPersonalKnowledgeSchema} from "../schemas/add-personal-knowledge.schema";
import {RetrievalModule, RetrievalService} from "../../assistant-retrieval/retrieval.module";
import {devLogger} from "../../../utils/logger.utils";
import {AssistantTool} from "../tools.module";
import {HTTPException} from "hono/http-exception";

const addPersonalKnowledgeAction = async ({content, userId}: AddPersonalKnowledgeParams) => {
    devLogger("Tool Called!!", `Tool: ${AssistantTool.ADD_PERSONAL_KNOWLEDGE} | Params: userId=${userId}, content=${content.substring(0, 50)}...`)
    const result = await RetrievalModule[RetrievalService.CREATE_PERSONAL_KNOWLEDGE]({content, userId});
    if (!result) throw new HTTPException(500, {message: `Error from tool: ${AssistantTool.ADD_PERSONAL_KNOWLEDGE}`})
    return result;
}

export const addPersonalKnowledgeTool = tool({
    description: `Agregar información personal del usuario a su base de conocimientos personal.
                Si el usuario proporciona información espontáneamente, úsala sin pedir confirmación.`,
    inputSchema: AddPersonalKnowledgeSchema,
    execute: addPersonalKnowledgeAction,
})
