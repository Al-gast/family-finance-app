import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { selectOne, withDatabase } from '../src/client'

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

  it('rolls back writes to an isolated temporary fixture', async () => {
    await withDatabase(
      { connectionString: databaseUrl },
      async (database) => {
        await database.execute(sql`
          create temporary table m0_rollback_fixture (
            fixture_id integer primary key,
            marker text not null
          ) on commit preserve rows
        `)

        await expect(
          database.transaction(async (transaction) => {
            await transaction.execute(sql`
              insert into m0_rollback_fixture (fixture_id, marker)
              values (1, 'must be rolled back')
            `)

            throw new Error('FORCED_ROLLBACK')
          }),
        ).rejects.toThrow('FORCED_ROLLBACK')

        const result = await database.execute<{ row_count: number }>(sql`
          select count(*)::integer as row_count
          from m0_rollback_fixture
        `)

        expect(result.rows[0]?.row_count).toBe(0)
      },
    )
  })
})

