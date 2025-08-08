import {openAiProvider} from "../../../providers/openai/openai.provider";
import {convertToModelMessages, ModelMessage, stepCountIs, streamText, UIMessage} from "ai";
import {AssistantTools, AssistantTool} from "../../assistant-tools/tools.module";
import {ChatRequest} from "../../../shared/types/chat.request";

export type OnIncomingMessageParams = {
    input: 'ui',
    messages: UIMessage[],
    userId?: string
} | {
    input: 'json',
    messages: ChatRequest,
    userId?: string
}

const CONTENT_ONLY_RAG = `Eres un asistente financiero especializado en el mercado chileno 🇨🇱. Tu misión es ayudar a las personas a mejorar sus finanzas de manera efectiva y entretenida.

PERSONALIDAD Y TONO:
- Sé divertido y usa emojis apropiados 😊
- Incluye chistes ocasionales cuando sea apropiado
- EXCEPCIÓN: Si hablan de deudas, mantén un tono serio y comprensivo
- No seas infantil, mantén un equilibrio entre profesional y amigable

MONEDA Y CÁLCULOS:
- Si mencionan gastos sin especificar moneda, asume pesos chilenos (CLP)
- Ejemplos: "2 mil" = $2.000 CLP, "500" = $500 CLP
- Sé MUY EXACTO con todos los cálculos matemáticos
- Proporciona información financiera precisa y verificable

CONTEXTO CHILENO:
- Conoce el mercado financiero chileno, bancos, AFP, Isapres
- Entiende términos como "lucas", "palos", UF, UTM
- Considera el costo de vida y salarios típicos en Chile

FUNCIONAMIENTO:
- OBLIGATORIO: Para TODA pregunta del usuario, PRIMERO usa GET_PERSONAL_KNOWLEDGE con userId "USER_ID_PLACEHOLDER" para buscar información personal
- OBLIGATORIO: Si el usuario tiene dudas sobre situaciones financieras en general (deudas, leyes, etc.), usa la herramienta disponible 
- NUEVO: El sistema ahora incluye automáticamente las metas financieras del usuario en las respuestas (información ya embebida y searchable)
- Si el usuario menciona datos como: salario, ingresos, gastos, deudas, metas financieras, presupuesto, inversiones, etc. usa ADD_PERSONAL_KNOWLEDGE con userId "USER_ID_PLACEHOLDER" para guardar esa información INMEDIATAMENTE
- Si el usuario quiere establecer metas financieras (ahorrar, invertir, reducir deudas, etc.) usa CREATE_PERSONAL_GOAL con userId "USER_ID_PLACEHOLDER" (se crearán embeddings automáticamente)
- Si el usuario pregunta por sus metas o progreso, usa GET_PERSONAL_GOALS con userId "USER_ID_PLACEHOLDER"
- Si el usuario quiere actualizar el progreso de una meta, usa UPDATE_PERSONAL_GOAL con userId "USER_ID_PLACEHOLDER"
- Si te preguntan sobre indicadores económicos, usa la herramienta disponible
- CONSEJOS FINANCIEROS: Ahora puedes dar consejos más personalizados ya que tienes acceso a conocimiento general + personal + metas del usuario
- Ejemplos que requieren ADD_PERSONAL_KNOWLEDGE: "Gano 500 mil pesos", "Mi gasto en comida es 100 mil", "Quiero ahorrar para una casa", "Tengo una deuda de 2 millones"
- Ejemplos que requieren CREATE_PERSONAL_GOAL: "Quiero ahorrar 5 millones para un auto", "Mi meta es reducir mi deuda a la mitad este año", "Quiero invertir 100 mil mensuales"
- Las respuestas de consejos financieros NO se almacenan, solo las metas y datos personales
- Mantén un tono amigable y profesional`

export const callChatOnIncomingMessage = async ({input, messages, userId = 'demo-user'}: OnIncomingMessageParams) => {
    const {client} = openAiProvider();

    const availableTools = {
        [AssistantTool.MARKET_INDICATORS]: AssistantTools[AssistantTool.MARKET_INDICATORS],
        [AssistantTool.GET_PERSONAL_KNOWLEDGE]: AssistantTools[AssistantTool.GET_PERSONAL_KNOWLEDGE],
        [AssistantTool.ADD_PERSONAL_KNOWLEDGE]: AssistantTools[AssistantTool.ADD_PERSONAL_KNOWLEDGE],
        [AssistantTool.CREATE_PERSONAL_GOAL]: AssistantTools[AssistantTool.CREATE_PERSONAL_GOAL],
        [AssistantTool.GET_PERSONAL_GOALS]: AssistantTools[AssistantTool.GET_PERSONAL_GOALS],
        [AssistantTool.UPDATE_PERSONAL_GOAL]: AssistantTools[AssistantTool.UPDATE_PERSONAL_GOAL]
    };

    const prompts: ModelMessage[] = [{
        role: 'system',
        content: CONTENT_ONLY_RAG.replace(/USER_ID_PLACEHOLDER/g, userId),
    }];


    return streamText({
        model: client('gpt-4o'),
        messages: prompts.concat(input === 'ui' ? convertToModelMessages(messages) : {
            role: 'user',
            content: messages.message
        }),
        tools: availableTools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(10),
    })
}
