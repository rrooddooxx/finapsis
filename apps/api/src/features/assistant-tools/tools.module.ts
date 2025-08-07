import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";
import {analyzeFinancialDocumentTool} from "./tools/analyze-financial-document.tool";
import {checkDocumentAnalysisStatusTool} from "./tools/check-document-analysis-status.tool";

export enum AssistantTool {
    MARKET_INDICATORS = 'MARKET_INDICATORS',
    ANALYZE_FINANCIAL_DOCUMENT = 'ANALYZE_FINANCIAL_DOCUMENT',
    CHECK_DOCUMENT_ANALYSIS_STATUS = 'CHECK_DOCUMENT_ANALYSIS_STATUS'
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
    [AssistantTool.ANALYZE_FINANCIAL_DOCUMENT]: analyzeFinancialDocumentTool,
    [AssistantTool.CHECK_DOCUMENT_ANALYSIS_STATUS]: checkDocumentAnalysisStatusTool,
}