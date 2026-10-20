import type { DatabaseConnectionSource } from '@family-finance/db'

export type WorkerBindings = {
  DB_FRESH: DatabaseConnectionSource
  NEON_AUTH_AUDIENCE?: string
  NEON_AUTH_ISSUER?: string
  NEON_AUTH_JWKS_URL?: string
}

