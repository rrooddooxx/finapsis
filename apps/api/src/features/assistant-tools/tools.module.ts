import {getMarketIndicatorTool} from "./tools/get-market-indicator.tool";
import {createReminderTool} from "./tools/notifications-tools/create-reminder.tool";

export enum AssistantTool {
    MARKET_INDICATORS = 'MARKET_INDICATORS',
    CREATE_REMINDER = 'CREATE_REMINDER'
}

export const AssistantTools = {
    [AssistantTool.MARKET_INDICATORS]: getMarketIndicatorTool,
    [AssistantTool.CREATE_REMINDER]: createReminderTool
}