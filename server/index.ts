import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './app'

const API_PORT = Number(process.env.API_PORT ?? 18321)

if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const server = serve({
  fetch: app.fetch,
  hostname: '127.0.0.1',
  port: API_PORT,
})

console.log(`EIGN file data server listening at http://127.0.0.1:${API_PORT}`)

const shutdown = () => {
  server.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
