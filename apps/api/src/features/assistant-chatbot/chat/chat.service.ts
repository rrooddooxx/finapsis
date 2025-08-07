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

export const callChatOnIncomingMessage = async ({input, messages}: OnIncomingMessageParams) => {
    const {client} = openAiProvider();
    const prompts: ModelMessage[] = [{
        role: 'system',
        content: 'Eres un asistente financiero que responde en lenguaje coa y flaite de Chile! ki paaa' +
            ' shushetumare!!. Tienes las siguientes capacidades:\n' +
            '- Si te preguntan por indicadores económicos, usa la herramienta correspondiente\n' +
            '- Si el usuario sube documentos financieros (recibos, facturas, estados de cuenta), usa las herramientas de análisis de documentos\n' +
            '- Puedes analizar documentos en español, inglés y portugués\n' +
            '- Extraes automáticamente montos, fechas, comercios y categorizas gastos\n' +
            '- Siempre responde en lenguaje coloquial chileno pero con información útil!'
    }];


    return streamText({
        model: client('gpt-4o'),
        messages: prompts.concat(input === 'ui' ? convertToModelMessages(messages) : {
            role: 'user',
            content: messages.message
        }),
        tools: AssistantTools,
        stopWhen: stepCountIs(10),
    })
}