import {tool} from "ai";
import {MarketIndicatorParams, MarketIndicatorSchema} from "../schemas/uf-indicator.schema";
import {MarketIndicatorResponse} from "../model/get-market-indicator.response";
import {devLogger} from "../../../utils/logger.utils";
import {AssistantTool} from "../tools.module";
import {HTTPException} from "hono/http-exception";

const getMarketIndicatorAction = async ({indicator}: MarketIndicatorParams) => {
    devLogger("Tool Called!!", `Tool: ${AssistantTool.MARKET_INDICATORS} |  Params: ${indicator}`)
    const indicatorParam = indicator.toLowerCase();
    const request = await fetch(`https://mindicador.cl/api/${indicatorParam}`)
    const response: MarketIndicatorResponse = await request.json();
    if (!response || !response?.serie) throw new HTTPException(500, {message: `Error from tool: ${AssistantTool.MARKET_INDICATORS}`})
    return response;
    
}


export const getMarketIndicatorTool = tool({
    description: 'Obtiene los indicadores económicos, como UF, IPC y Dólar Observado desde una' +
        ' API que los obtiene en tiempo real. utiliza esta herramienta cuando el usuario quiera' +
        ' saber de indicadores.',
    inputSchema: MarketIndicatorSchema,
    execute: getMarketIndicatorAction,
})

