import { randomUUID } from 'node:crypto'
import { sql, type SQL } from 'drizzle-orm'
import {
  withDatabase,
  type Database,
  type DatabaseConnectionSource,
} from './client'

export type InteractiveTransactionVerification = {
  beginCommit: boolean
  beginRollback: boolean
  cleanupComplete: boolean
  freshReadAfterCommit: boolean
  readAfterWrite: boolean
  readFromNewConnection: boolean
  rollbackRemovedAllWrites: boolean
}

function fixtureIdentifier(tableName: string): SQL {
  return sql`${sql.identifier('public')}.${sql.identifier(tableName)}`
}

async function readMarker(
  database: Database,
  tableName: string,
  fixtureId = 'fresh-read',
): Promise<number | undefined> {
  const result = await database.execute<{ marker: number }>(sql`
    select marker
    from ${fixtureIdentifier(tableName)}
    where fixture_id = ${fixtureId}
  `)

  return result.rows[0]?.marker
}

async function readMarkerFromNewConnection(
  source: DatabaseConnectionSource,
  tableName: string,
): Promise<number | undefined> {
  return withDatabase(source, (database) => readMarker(database, tableName))
}

async function fixtureExists(
  source: DatabaseConnectionSource,
  tableName: string,
): Promise<boolean> {
  return withDatabase(source, async (database) => {
    const result = await database.execute<{ relation_name: string | null }>(
      sql`select to_regclass(${`public.${tableName}`})::text as relation_name`,
    )

    return result.rows[0]?.relation_name !== null
  })
}

function requireMarker(actual: number | undefined, expected: number): void {
  if (actual !== expected) {
    throw new Error(
      `M0.4 fixture marker mismatch: expected ${expected}, received ${String(actual)}`,
    )
  }
}

/**
 * Exercises interactive PostgreSQL transactions without touching application,
 * financial, or authentication tables. The uniquely named fixture table is
 * always dropped, including after an assertion or connection failure.
 */
export async function verifyInteractiveTransactions(
  source: DatabaseConnectionSource,
): Promise<InteractiveTransactionVerification> {
  const tableName = `m0_transaction_${randomUUID().replaceAll('-', '')}`
  let fixtureCreated = false
  let verification:
    | Omit<InteractiveTransactionVerification, 'cleanupComplete'>
    | undefined

  try {
    verification = await withDatabase(source, async (database) => {
      await database.execute(sql`
        create table ${fixtureIdentifier(tableName)} (
          fixture_id text primary key,
          marker integer not null
        )
      `)
      fixtureCreated = true

      await database.transaction(async (transaction) => {
        await transaction.execute(sql`
          insert into ${fixtureIdentifier(tableName)} (fixture_id, marker)
          values ('fresh-read', 1)
        `)
      })

      requireMarker(await readMarker(database, tableName), 1)
      requireMarker(await readMarkerFromNewConnection(source, tableName), 1)

      await database.transaction(async (transaction) => {
        await transaction.execute(sql`
          update ${fixtureIdentifier(tableName)}
          set marker = 2
          where fixture_id = 'fresh-read'
        `)
      })

      requireMarker(await readMarker(database, tableName), 2)
      requireMarker(await readMarkerFromNewConnection(source, tableName), 2)

      let forcedRollbackObserved = false
      try {
        await database.transaction(async (transaction) => {
          await transaction.execute(sql`
            update ${fixtureIdentifier(tableName)}
            set marker = 3
            where fixture_id = 'fresh-read'
          `)
          await transaction.execute(sql`
            insert into ${fixtureIdentifier(tableName)} (fixture_id, marker)
            values ('rollback-only', 99)
          `)

          throw new Error('M0_4_FORCED_ROLLBACK')
        })
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'M0_4_FORCED_ROLLBACK'
        ) {
          forcedRollbackObserved = true
        } else {
          throw error
        }
      }

      requireMarker(await readMarker(database, tableName), 2)
      requireMarker(await readMarkerFromNewConnection(source, tableName), 2)
      if ((await readMarker(database, tableName, 'rollback-only')) !== undefined) {
        throw new Error('M0.4 rollback left a partial fixture write')
      }

      return {
        beginCommit: true,
        beginRollback: forcedRollbackObserved,
        freshReadAfterCommit: true,
        readAfterWrite: true,
        readFromNewConnection: true,
        rollbackRemovedAllWrites: true,
      }
    })
  } finally {
    if (fixtureCreated) {
      await withDatabase(source, async (database) => {
        await database.execute(
          sql`drop table if exists ${fixtureIdentifier(tableName)}`,
        )
      })
    }
  }

  if (!verification) {
    throw new Error('M0.4 transaction verification did not complete')
  }

  const cleanupComplete = !(await fixtureExists(source, tableName))
  if (!cleanupComplete) {
    throw new Error('M0.4 fixture cleanup could not be verified')
  }

  return { ...verification, cleanupComplete }
}
