import { createAuthClient } from '@neondatabase/auth'
import {
  BetterAuthVanillaAdapter,
  type BetterAuthVanillaAdapterInstance,
} from '@neondatabase/auth/vanilla'

export type VerifiedUser = {
  id: string
  email?: string
}

type SessionReader = {
  getSession: (options?: {
    fetchOptions?: { headers?: Record<string, string> }
  }) => Promise<{
    data?: {
      session?: unknown
    } | null
  }>
  token: (options?: {
    fetchOptions?: { headers?: Record<string, string> }
  }) => Promise<{
    data?: { token?: string } | null
  }>
}

type MeResponse = {
  data: { user: VerifiedUser }
}

const authUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim()
type NeonAuthClient = ReturnType<
  BetterAuthVanillaAdapterInstance['getBetterAuthInstance']
>
let authClient: NeonAuthClient | undefined

export function isNeonAuthConfigured() {
  return Boolean(authUrl)
}

export function getAuthClient() {
  if (!authUrl) {
    throw new Error('VITE_NEON_AUTH_URL is not configured')
  }

  authClient ??= createAuthClient<BetterAuthVanillaAdapterInstance>(authUrl, {
    adapter: BetterAuthVanillaAdapter(),
  })
  return authClient
}

function isMeResponse(value: unknown): value is MeResponse {
  if (!value || typeof value !== 'object' || !('data' in value)) {
    return false
  }

  const data = value.data
  if (!data || typeof data !== 'object' || !('user' in data)) {
    return false
  }

  const user = data.user
  return Boolean(
    user &&
      typeof user === 'object' &&
      'id' in user &&
      typeof user.id === 'string' &&
      user.id.length > 0,
  )
}

export async function getVerifiedSession(
  client: SessionReader = getAuthClient(),
  fetchImplementation: typeof fetch = fetch,
): Promise<VerifiedUser | null> {
  const sessionResult = await client.getSession({
    fetchOptions: { headers: { 'X-Force-Fetch': 'true' } },
  })

  if (!sessionResult.data?.session) {
    return null
  }

  // The Neon SDK maps both /get-session and /token to its session cache.
  // Force the token exchange so a cached session response cannot be returned
  // in place of the short-lived JWT response.
  const tokenResult = await client.token({
    fetchOptions: { headers: { 'X-Force-Fetch': 'true' } },
  })
  const token = tokenResult.data?.token

  if (!token) {
    return null
  }

  const response = await fetchImplementation('/api/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to verify the authenticated session')
  }

  const body: unknown = await response.json()
  if (!isMeResponse(body)) {
    throw new Error('The session response was invalid')
  }

  return body.data.user
}
