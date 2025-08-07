import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";
import {analyzeFinancialDocumentTool} from "./tools/analyze-financial-document.tool";
import {checkDocumentAnalysisStatusTool} from "./tools/check-document-analysis-status.tool";
import {addKnowledgeTool} from "./tools/add-knowledge.tool";
import {getKnowledgeTool} from "./tools/get-knowledge.tool";

export enum AssistantTool {
    ANALYZE_FINANCIAL_DOCUMENT = 'ANALYZE_FINANCIAL_DOCUMENT',
    CHECK_DOCUMENT_ANALYSIS_STATUS = 'CHECK_DOCUMENT_ANALYSIS_STATUS',
    MARKET_INDICATORS = 'MARKET_INDICATORS',
    ADD_KNOWLEDGE = 'ADD_KNOWLEDGE',
    FIND_RELEVANT_KNOWLEDGE = 'FIND_RELEVANT_KNOWLEDGE',
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
    [AssistantTool.ANALYZE_FINANCIAL_DOCUMENT]: analyzeFinancialDocumentTool,
    [AssistantTool.CHECK_DOCUMENT_ANALYSIS_STATUS]: checkDocumentAnalysisStatusTool,
    [AssistantTool.ADD_KNOWLEDGE]: addKnowledgeTool,
    [AssistantTool.FIND_RELEVANT_KNOWLEDGE]: getKnowledgeTool,
}
