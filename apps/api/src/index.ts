import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'
import AppRouter from "./routing/router.main";
import {devLogger} from "./utils/logger.utils";
import {workerManager} from "./workers";
import { clearAllData } from "./providers/supabase";

const app = new Hono()

// Clear all data on startup if in development
if (process.env.NODE_ENV === 'development' && process.env.CLEAR_DB_ON_START === 'true') {
    clearAllData().catch(console.error);
}

app.use('*', logger(devLogger))
app.use('*', cors())
app.route("", AppRouter)

// Start workers when server starts (if enabled)
async function startServer() {
  try {
    // Start background workers
    await workerManager.start();
    devLogger('Server', '🚀 Server and workers started successfully');
  } catch (error) {
    devLogger('Server', `❌ Failed to start server/workers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Auto-start when this file is loaded
startServer();

export default {
    port: process.env.PORT || 3000,
    fetch: app.fetch,
    // Configure maximum idle timeout for SSE connections (4 minutes - Bun's limit is 255 seconds)
    idleTimeout: 255, // 255 seconds (4.25 minutes) - Bun's maximum allowed value
}
