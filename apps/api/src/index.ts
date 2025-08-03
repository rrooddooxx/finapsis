import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'finapsis-api',
        version: '1.0.0'
    })
})

app.get('/', (c) => {
    return c.text('Finapsis API - Ready for deployment!')
})

app.get('/api/status', (c) => {
    return c.json({
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    })
})

export default {
    port: process.env.PORT || 3000,
    fetch: app.fetch,
}
