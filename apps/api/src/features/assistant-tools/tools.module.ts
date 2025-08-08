import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";
import {analyzeFinancialDocumentTool} from "./tools/analyze-financial-document.tool";
import {checkDocumentAnalysisStatusTool} from "./tools/check-document-analysis-status.tool";
import {addPersonalKnowledgeTool} from "./tools/add-personal-knowledge.tool";
import {getPersonalKnowledgeTool} from "./tools/get-personal-knowledge.tool";
import {createPersonalGoalTool} from "./tools/create-personal-goal.tool";
import {getPersonalGoalsTool} from "./tools/get-personal-goals.tool";
import {updatePersonalGoalTool} from "./tools/update-personal-goal.tool";

export enum AssistantTool {
    ANALYZE_FINANCIAL_DOCUMENT = 'ANALYZE_FINANCIAL_DOCUMENT',
    CHECK_DOCUMENT_ANALYSIS_STATUS = 'CHECK_DOCUMENT_ANALYSIS_STATUS',
    MARKET_INDICATORS = 'MARKET_INDICATORS',
    ADD_PERSONAL_KNOWLEDGE = 'ADD_PERSONAL_KNOWLEDGE',
    GET_PERSONAL_KNOWLEDGE = 'GET_PERSONAL_KNOWLEDGE',
    CREATE_PERSONAL_GOAL = 'CREATE_PERSONAL_GOAL',
    GET_PERSONAL_GOALS = 'GET_PERSONAL_GOALS',
    UPDATE_PERSONAL_GOAL = 'UPDATE_PERSONAL_GOAL',
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
    [AssistantTool.ANALYZE_FINANCIAL_DOCUMENT]: analyzeFinancialDocumentTool,
    [AssistantTool.CHECK_DOCUMENT_ANALYSIS_STATUS]: checkDocumentAnalysisStatusTool,
    [AssistantTool.ADD_PERSONAL_KNOWLEDGE]: addPersonalKnowledgeTool,
    [AssistantTool.GET_PERSONAL_KNOWLEDGE]: getPersonalKnowledgeTool,
    [AssistantTool.CREATE_PERSONAL_GOAL]: createPersonalGoalTool,
    [AssistantTool.GET_PERSONAL_GOALS]: getPersonalGoalsTool,
    [AssistantTool.UPDATE_PERSONAL_GOAL]: updatePersonalGoalTool,
}
