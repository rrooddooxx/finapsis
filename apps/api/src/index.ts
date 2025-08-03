import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'
import AppRouter from "./routing/router.main";

const app = new Hono()

app.use('*', logger())
app.use('*', cors())
app.route("", AppRouter)

export default {
    port: process.env.PORT || 3000,
    fetch: app.fetch,
}
