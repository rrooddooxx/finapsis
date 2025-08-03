import {openAiProvider} from "../../../providers/openai/openai.provider";
import {ModelMessage, streamText} from "ai";

export const callChatOnIncomingMessage = (message: string) => {
    const {client} = openAiProvider();
    const messages: ModelMessage[] = [{
        role: 'user',
        content: message,
    }, {
        role: 'system',
        content: 'Eres un asistente que sólo responde en lenguaje coa y flaite de Chile! ki paaa' +
            ' shushetumare!!'
    }];

    const result = streamText({
        model: client('gpt-3.5-turbo'),
        messages,
    })

    return result;
}