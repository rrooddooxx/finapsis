import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";

export enum AssistantTool {
    MARKET_INDICATORS = 'MARKET_INDICATORS'
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
}