import { Hono } from 'hono'
import {
  AuthConfigurationError,
  type AuthIdentity,
  type VerifyAccessToken,
  verifyWorkerAccessToken,
} from './auth'
import type { WorkerBindings } from './bindings'

type WorkerVariables = {
  authIdentity: AuthIdentity
  requestId: string
}

type AppOptions = {
  verifyToken?: VerifyAccessToken
}

function getBearerToken(authorization: string | undefined) {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i)
  return match?.[1]
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono<{
    Bindings: WorkerBindings
    Variables: WorkerVariables
  }>()
  const verifyToken = options.verifyToken ?? verifyWorkerAccessToken

  app.get('/health', (context) => {
    context.header('Cache-Control', 'no-store')
    return context.json({ status: 'ok' })
  })

  app.use('/api/v1/*', async (context, next) => {
    context.header('Cache-Control', 'no-store')
    const requestId = crypto.randomUUID()
    context.set('requestId', requestId)
    context.header('X-Request-ID', requestId)

    const token = getBearerToken(context.req.header('Authorization'))
    if (!token) {
      return context.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            details: [],
            message: 'Authentication required.',
          },
          meta: { requestId },
        },
        401,
      )
    }

    try {
      context.set('authIdentity', await verifyToken(token, context.env))
    } catch (error) {
      if (error instanceof AuthConfigurationError) {
        return context.json(
          {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              details: [],
              message: 'Authentication service is unavailable.',
            },
            meta: { requestId },
          },
          500,
        )
      }

      return context.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            details: [],
            message: 'Authentication required.',
          },
          meta: { requestId },
        },
        401,
      )
    }

    await next()
  })

  app.get('/api/v1/me', (context) =>
    context.json({
      data: { user: context.get('authIdentity') },
      meta: { requestId: context.get('requestId') },
    }),
  )

  return app
}

const app = createApp()

export default app

