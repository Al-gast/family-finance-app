import { describe, expect, it } from 'vitest'
import app from './validation'

describe('validation release routes', () => {
  it('keeps the public health endpoint available without bindings', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it.each(['/auth', '/auth/callback', '/api/v1/me', '/api/private'])(
    'disables unfinished route %s',
    async (path) => {
      const response = await app.request(path)

      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'NOT_FOUND' },
      })
    },
  )
})
