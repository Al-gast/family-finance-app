import { Hono, type Handler } from 'hono'

export function createValidationApp() {
  const app = new Hono()

  app.get('/health', (context) => {
    context.header('Cache-Control', 'no-store')
    return context.json({ status: 'ok' })
  })

  const disabledRoute: Handler = (context) => {
    context.header('Cache-Control', 'no-store')
    return context.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'This route is not available in the validation release.',
        },
      },
      404,
    )
  }

  app.all('/auth', disabledRoute)
  app.all('/auth/*', disabledRoute)
  app.all('/api/*', disabledRoute)

  return app
}

export default createValidationApp()
