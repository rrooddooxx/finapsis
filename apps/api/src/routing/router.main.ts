import {Hono} from "hono";
import {ChatRouter} from "../features/assistant-chatbot/chat/chat.router";

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
export default AppRouter;