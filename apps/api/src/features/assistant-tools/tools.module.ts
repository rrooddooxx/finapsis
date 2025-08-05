import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";
import {addKnowledgeTool} from "./tools/add-knowledge.tool";
import {getKnowledgeTool} from "./tools/get-knowledge.tool";

export enum AssistantTool {
    MARKET_INDICATORS = 'MARKET_INDICATORS',
    ADD_KNOWLEDGE = 'ADD_KNOWLEDGE',
    FIND_RELEVANT_KNOWLEDGE = 'FIND_RELEVANT_KNOWLEDGE',
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
    [AssistantTool.ADD_KNOWLEDGE]: addKnowledgeTool,
    [AssistantTool.FIND_RELEVANT_KNOWLEDGE]: getKnowledgeTool,
}
