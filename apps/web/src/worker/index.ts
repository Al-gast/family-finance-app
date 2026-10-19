import { Hono } from 'hono'
import type { WorkerBindings } from './bindings'

const app = new Hono<{ Bindings: WorkerBindings }>()

app.get('/health', (context) => {
  context.header('Cache-Control', 'no-store')
  return context.json({ status: 'ok' })
})

export default app

