import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { createLocalJWKSet, type JSONWebKeySet } from 'jose'
import { verifyNeonAccessToken } from './auth'

const issuer = 'https://auth.example.test'
const audience = 'family-finance'
const keyId = 'm0.3-test-key'

let privateKey: CryptoKey
let localJwks: ReturnType<typeof createLocalJWKSet>

beforeAll(async () => {
  const keyPair = await generateKeyPair('EdDSA')
  privateKey = keyPair.privateKey
  const publicJwk = await exportJWK(keyPair.publicKey)
  localJwks = createLocalJWKSet({
    keys: [{ ...publicJwk, alg: 'EdDSA', kid: keyId, use: 'sig' }],
  } satisfies JSONWebKeySet)
})

async function issueToken(overrides: {
  audience?: string
  expiresAt?: number | string
  issuer?: string
  subject?: string
} = {}) {
  return new SignJWT({ email: 'member@example.test', role: 'authenticated' })
    .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setSubject(overrides.subject ?? 'neon-user-123')
    .setIssuedAt()
    .setExpirationTime(overrides.expiresAt ?? '15m')
    .sign(privateKey)
}

describe('verifyNeonAccessToken', () => {
  it('accepts a valid signed token and derives identity from verified claims', async () => {
    const identity = await verifyNeonAccessToken(
      await issueToken(),
      {
        issuer,
        audience,
        jwksUrl: `${issuer}/.well-known/jwks.json`,
      },
      localJwks,
    )

    expect(identity).toEqual({
      id: 'neon-user-123',
      email: 'member@example.test',
    })
  })

  it.each([
    ['an expired token', { expiresAt: 1 }],
    ['a token from another issuer', { issuer: 'https://attacker.example.test' }],
    ['a token for another audience', { audience: 'another-api' }],
    ['a token without a subject', { subject: '' }],
  ])('rejects %s', async (_description, tokenOptions) => {
    await expect(
      verifyNeonAccessToken(
        await issueToken(tokenOptions),
        {
          issuer,
          audience,
          jwksUrl: `${issuer}/.well-known/jwks.json`,
        },
        localJwks,
      ),
    ).rejects.toThrow()
  })

  it('rejects a token signed by an untrusted key', async () => {
    const untrustedKeyPair = await generateKeyPair('EdDSA')
    const token = await new SignJWT({ email: 'attacker@example.test' })
      .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('attacker')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(untrustedKeyPair.privateKey)

    await expect(
      verifyNeonAccessToken(
        token,
        {
          issuer,
          audience,
          jwksUrl: `${issuer}/.well-known/jwks.json`,
        },
        localJwks,
      ),
    ).rejects.toThrow()
  })
})
