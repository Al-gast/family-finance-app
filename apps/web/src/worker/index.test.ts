import { describe, expect, it } from 'vitest'
import app, { createApp } from './index'

describe('GET /health', () => {
  it('returns a public health response without secrets or dependencies', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})

describe('GET /api/v1/me', () => {
  it('returns 401 when the bearer token is missing', async () => {
    const response = await app.request('/api/v1/me')

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns only the identity produced by backend token verification', async () => {
    const authenticatedApp = createApp({
      verifyToken: async () => ({
        id: 'verified-neon-subject',
        email: 'verified@example.test',
      }),
    })

    const response = await authenticatedApp.request(
      '/api/v1/me?userId=untrusted-client-id',
      {
        headers: {
          Authorization: 'Bearer signed-token',
          'X-User-ID': 'another-untrusted-client-id',
        },
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      data: {
        user: {
          id: 'verified-neon-subject',
          email: 'verified@example.test',
        },
      },
    })
  })

  it('returns 401 without leaking token verification details', async () => {
    const authenticatedApp = createApp({
      verifyToken: async () => {
        throw new Error('sensitive verifier detail')
      },
    })

    const response = await authenticatedApp.request('/api/v1/me', {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    const body = await response.text()

    expect(response.status).toBe(401)
    expect(body).not.toContain('sensitive verifier detail')
  })
})

