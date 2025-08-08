import {Hono} from "hono";
import {ChatRouter} from "../features/assistant-chatbot/chat/chat.router";
import {KnowledgeRouter} from "../features/general-knowledge/knowledge.router";
import documentUploadRouter from "../features/document-upload/document-upload.router";
import {realtimeChatRouter} from "../features/assistant-chatbot/realtime-chat.controller";

const AppRouter = new Hono()

AppRouter.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'finapsis-api',
        version: '1.0.0'
    })
})

AppRouter.get('/api/status', (c) => {
    return c.json({
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    })
})

AppRouter.route("/api", ChatRouter);
AppRouter.route("/api/knowledge", KnowledgeRouter);
AppRouter.route("/api/files", documentUploadRouter);
AppRouter.route("/api/chat/realtime", realtimeChatRouter);
export default AppRouter;