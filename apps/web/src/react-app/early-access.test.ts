import { describe, expect, it } from 'vitest'
import { resolveEarlyAccessUrl } from './early-access'

describe('resolveEarlyAccessUrl', () => {
  it.each([undefined, '', '   ', 'not a URL', 'javascript:alert(1)'])(
    'uses the unavailable state for %s',
    (configuredValue) => {
      expect(resolveEarlyAccessUrl(configuredValue)).toBeNull()
    },
  )

  it('accepts a secure external early-access destination', () => {
    expect(resolveEarlyAccessUrl('https://example.com/waitlist')).toBe(
      'https://example.com/waitlist',
    )
  })

  it('rejects insecure external destinations', () => {
    expect(resolveEarlyAccessUrl('http://example.com/waitlist')).toBeNull()
  })

  it('allows HTTP localhost for local CTA verification', () => {
    expect(resolveEarlyAccessUrl('http://localhost:3000/waitlist')).toBe(
      'http://localhost:3000/waitlist',
    )
  })
})
