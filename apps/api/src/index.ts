import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'
import AppRouter from "./routing/router.main";
import {devLogger} from "./utils/logger.utils";
import { clearAllData } from "./providers/supabase";

const app = new Hono()

// Clear all data on startup if in development
if (process.env.NODE_ENV === 'development' && process.env.CLEAR_DB_ON_START === 'true') {
    clearAllData().catch(console.error);
}

app.use('*', logger(devLogger))
app.use('*', cors())
app.route("", AppRouter)

export default {
    port: process.env.PORT || 3000,
    fetch: app.fetch,
}
