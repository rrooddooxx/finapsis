import {Context} from "hono";
import {stream} from "hono/streaming";
import {ChatRequest} from "../../../shared/types/chat.request";
import {callChatOnIncomingMessage} from "./chat.service";
import {UIMessage} from "ai";

export const handleUiChatInput = async (c: Context) => {
    const requestBody = await c.req.json<{ messages: UIMessage[] }>();
    const userId = c.req.header('X-User-Email') || 'demo-user';
    const result = await callChatOnIncomingMessage({
        input: 'ui', 
        messages: requestBody.messages, 
        userId
    })
    return result.toUIMessageStreamResponse({
        onError: (error) => {
            console.log('error: ', error)
            return JSON.stringify(error);
        }
    });
}

export const handleJsonChatInput = async (c: Context) => {
    const requestBody = await c.req.json<ChatRequest>();
    const result = await callChatOnIncomingMessage({input: 'json', messages: requestBody})
    return stream(c, stream => stream.pipe(result.textStream));
}