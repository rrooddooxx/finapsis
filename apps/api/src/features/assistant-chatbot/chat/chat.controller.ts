import {Context} from "hono";
import {stream} from "hono/streaming";
import {ChatRequest} from "../../../shared/types/chat.request";
import {callChatOnIncomingMessage} from "./chat.service";

export const receiveChatMessage = async (c: Context) => {
    const requestBody = await c.req.json<ChatRequest>();
    const response = callChatOnIncomingMessage(requestBody.message)
    return stream(c, async (streamWriter) => {
        for await (const part of response.textStream) {
            await streamWriter.write(part);
        }
    })
}