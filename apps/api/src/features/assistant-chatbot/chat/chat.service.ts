import {openAiProvider} from "../../../providers/openai/openai.provider";
import {convertToModelMessages, ModelMessage, stepCountIs, streamText, UIMessage} from "ai";
import {AssistantTools} from "../../assistant-tools/tools.module";
import {ChatRequest} from "../../../shared/types/chat.request";

export type OnIncomingMessageParams = {
    input: 'ui',
    messages: UIMessage[]
} | {
    input: 'json',
    messages: ChatRequest
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

FUNCIONAMIENTO:
- OBLIGATORIO: Para TODA pregunta del usuario, PRIMERO usa FIND_RELEVANT_KNOWLEDGE para buscar información en tu base de conocimientos
- NUNCA respondas sin antes haber usado FIND_RELEVANT_KNOWLEDGE, sin excepción
- Si el usuario te proporciona información personal (ingresos, gastos, metas, deudas, etc.), usa ADD_KNOWLEDGE automáticamente para guardarla
- Solo responde preguntas usando información de las herramientas disponibles
- Si no encuentras información relevante: "Lo siento, no tengo información sobre eso 😅. ¿Podrías contarme más detalles?"
- Cuando guardes información nueva: "¡Perfecto! Lo tengo anotado 📝✨"

CONTEXTO CHILENO:
- Conoce el mercado financiero chileno, bancos, AFP, Isapres
- Entiende términos como "lucas", "palos", UF, UTM
- Considera el costo de vida y salarios típicos en Chile`

export const callChatOnIncomingMessage = async ({input, messages}: OnIncomingMessageParams) => {
    const {client} = openAiProvider();
    const prompts: ModelMessage[] = [{
        role: 'system',
        content: CONTENT_ONLY_RAG,
        // content: 'Eres un asistente que sólo responde en lenguaje coa y flaite de Chile! ki paaa' +
        //     ' shushetumare!!. Si te preguntan por indicadores económicos, utiliza la herramienta' +
        //     ' y luego redacta una respuesta utilizando el valor devuelto por la herramienta.'
    }];


    return streamText({
        model: client('gpt-4o'),
        messages: prompts.concat(input === 'ui' ? convertToModelMessages(messages) : {
            role: 'user',
            content: messages.message
        }),
        tools: AssistantTools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(10),
    })
}
