import { describe, expect, it } from 'vitest'
import app from './index'

describe('GET /health', () => {
  it('returns a public health response without secrets or dependencies', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})

