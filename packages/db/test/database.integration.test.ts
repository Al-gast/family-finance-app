import { describe, expect, it } from 'vitest'
import { selectOne, withDatabase } from '../src/client'
import { verifyInteractiveTransactions } from '../src/transaction-verification'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for the PostgreSQL integration test',
  )
}

describe('PostgreSQL infrastructure', () => {
  it('executes SELECT 1 through pg and Drizzle', async () => {
    await expect(
      withDatabase({ connectionString: databaseUrl }, selectOne),
    ).resolves.toBe(true)
  })

  it('commits, rolls back, and returns fresh reads from a new connection', async () => {
    await expect(
      verifyInteractiveTransactions({ connectionString: databaseUrl }),
    ).resolves.toEqual({
      beginCommit: true,
      beginRollback: true,
      cleanupComplete: true,
      freshReadAfterCommit: true,
      readAfterWrite: true,
      readFromNewConnection: true,
      rollbackRemovedAllWrites: true,
    })
  })
})

