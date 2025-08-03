import {Hono} from "hono";
import {receiveChatMessage} from "./chat.controller";

export const ChatRouter = new Hono().basePath("/chat")

ChatRouter.post("/", receiveChatMessage)