import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose'
import type { WorkerBindings } from './bindings'

export type AuthIdentity = {
  id: string
  email?: string
}

export type NeonAuthVerificationConfig = {
  audience?: string
  issuer: string
  jwksUrl: string
}

export type VerifyAccessToken = (
  token: string,
  bindings: WorkerBindings,
) => Promise<AuthIdentity>

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthConfigurationError'
  }
}

const remoteJwksByUrl = new Map<string, JWTVerifyGetKey>()

function requireHttpsUrl(value: string, bindingName: string) {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new AuthConfigurationError(`${bindingName} must be a valid URL`)
  }

  if (url.protocol !== 'https:') {
    throw new AuthConfigurationError(`${bindingName} must use HTTPS`)
  }

  return url
}

export function getNeonAuthVerificationConfig(
  bindings: WorkerBindings,
): NeonAuthVerificationConfig {
  const jwksUrl = bindings.NEON_AUTH_JWKS_URL?.trim()
  const issuer = bindings.NEON_AUTH_ISSUER?.trim()
  const audience = bindings.NEON_AUTH_AUDIENCE?.trim() || undefined

  if (!jwksUrl || !issuer) {
    throw new AuthConfigurationError(
      'NEON_AUTH_JWKS_URL and NEON_AUTH_ISSUER must be configured',
    )
  }

  requireHttpsUrl(jwksUrl, 'NEON_AUTH_JWKS_URL')
  requireHttpsUrl(issuer, 'NEON_AUTH_ISSUER')

  return { audience, issuer, jwksUrl }
}

function getRemoteJwks(jwksUrl: string) {
  const cached = remoteJwksByUrl.get(jwksUrl)
  if (cached) {
    return cached
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl))
  remoteJwksByUrl.set(jwksUrl, jwks)
  return jwks
}

export async function verifyNeonAccessToken(
  token: string,
  config: NeonAuthVerificationConfig,
  keyResolver: JWTVerifyGetKey = getRemoteJwks(config.jwksUrl),
): Promise<AuthIdentity> {
  const { payload } = await jwtVerify(token, keyResolver, {
    algorithms: ['EdDSA'],
    audience: config.audience,
    issuer: config.issuer,
  })

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Verified token has no subject')
  }

  return {
    id: payload.sub,
    ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
  }
}

export const verifyWorkerAccessToken: VerifyAccessToken = (token, bindings) =>
  verifyNeonAccessToken(token, getNeonAuthVerificationConfig(bindings))
