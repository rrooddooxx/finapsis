import {Hono} from "hono";
import {handleJsonChatInput, handleUiChatInput} from "./chat.controller";

export const ChatRouter = new Hono().basePath("/chat")

ChatRouter.post("/ui", handleUiChatInput)
ChatRouter.post("/", handleJsonChatInput)
