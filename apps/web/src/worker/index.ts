import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (context) => {
  context.header('Cache-Control', 'no-store')
  return context.json({ status: 'ok' })
})

export default app

