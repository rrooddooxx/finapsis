import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";
import {addPersonalKnowledgeTool} from "./tools/add-personal-knowledge.tool";
import {getPersonalKnowledgeTool} from "./tools/get-personal-knowledge.tool";
import {createPersonalGoalTool} from "./tools/create-personal-goal.tool";
import {getPersonalGoalsTool} from "./tools/get-personal-goals.tool";
import {updatePersonalGoalTool} from "./tools/update-personal-goal.tool";

export enum AssistantTool {
    MARKET_INDICATORS = 'MARKET_INDICATORS',
    ADD_PERSONAL_KNOWLEDGE = 'ADD_PERSONAL_KNOWLEDGE',
    GET_PERSONAL_KNOWLEDGE = 'GET_PERSONAL_KNOWLEDGE',
    CREATE_PERSONAL_GOAL = 'CREATE_PERSONAL_GOAL',
    GET_PERSONAL_GOALS = 'GET_PERSONAL_GOALS',
    UPDATE_PERSONAL_GOAL = 'UPDATE_PERSONAL_GOAL',
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
    [AssistantTool.ADD_PERSONAL_KNOWLEDGE]: addPersonalKnowledgeTool,
    [AssistantTool.GET_PERSONAL_KNOWLEDGE]: getPersonalKnowledgeTool,
    [AssistantTool.CREATE_PERSONAL_GOAL]: createPersonalGoalTool,
    [AssistantTool.GET_PERSONAL_GOALS]: getPersonalGoalsTool,
    [AssistantTool.UPDATE_PERSONAL_GOAL]: updatePersonalGoalTool,
}
