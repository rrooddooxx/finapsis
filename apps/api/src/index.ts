import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'
import AppRouter from "./routing/router.main";
import {devLogger} from "./utils/logger.utils";
import {workerManager} from "./workers";

const app = new Hono()

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
}
