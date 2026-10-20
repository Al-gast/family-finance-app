import { describe, expect, it, vi } from 'vitest'
import { getVerifiedSession } from './auth-client'

describe('getVerifiedSession', () => {
  it('does not call the application API without a Neon session token', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    const getToken = vi.fn(async () => ({ data: { token: 'unexpected' } }))

    const user = await getVerifiedSession(
      { getSession: async () => ({ data: null }), token: getToken },
      fetchImplementation,
    )

    expect(user).toBeNull()
    expect(fetchImplementation).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('sends the session token and uses only the backend-verified identity', async () => {
    const getToken = vi.fn(async () => ({
      data: { token: 'neon-signed-token' },
    }))
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          user: { id: 'verified-subject', email: 'verified@example.test' },
        },
      }),
    )

    const user = await getVerifiedSession(
      {
        getSession: async () => ({
          data: { session: { id: 'opaque-session' } },
        }),
        token: getToken,
      },
      fetchImplementation,
    )

    expect(getToken).toHaveBeenCalledWith({
      fetchOptions: { headers: { 'X-Force-Fetch': 'true' } },
    })
    expect(fetchImplementation).toHaveBeenCalledWith('/api/v1/me', {
      headers: { Authorization: 'Bearer neon-signed-token' },
    })
    expect(user).toEqual({
      id: 'verified-subject',
      email: 'verified@example.test',
    })
  })

  it('clears local session state when the backend rejects the token', async () => {
    const user = await getVerifiedSession(
      {
        getSession: async () => ({
          data: { session: { id: 'opaque-session' } },
        }),
        token: async () => ({ data: { token: 'expired-token' } }),
      },
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })),
    )

    expect(user).toBeNull()
  })
})
