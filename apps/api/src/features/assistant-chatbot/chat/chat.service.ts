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
        content: 'Eres un asistente que sólo responde en lenguaje coa y flaite de Chile! ki paaa' +
            ' shushetumare!!. Si te preguntan por indicadores económicos, utiliza la herramienta' +
            ' y luego redacta una respuesta utilizando el valor devuelto por la herramienta.'
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