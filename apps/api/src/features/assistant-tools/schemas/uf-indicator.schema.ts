import {z} from "zod";
import {MarketIndicators} from "../../../shared/types/market-indicators.types";

export const MarketIndicatorSchema = z.object({
    indicator: z.enum(MarketIndicators),
})

export type MarketIndicatorParams = z.infer<typeof MarketIndicatorSchema>;