import { sql } from 'drizzle-orm'
import {
  drizzle,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres'
import { Client } from 'pg'

export type Database = NodePgDatabase<Record<string, never>>

export type DatabaseConnectionSource = {
  connectionString: string
}

export type DatabaseOperation<T> = (
  database: Database,
  client: Client,
) => Promise<T>

export class DatabaseConfigurationError extends Error {
  constructor() {
    super('A PostgreSQL connection string is required')
    this.name = 'DatabaseConfigurationError'
  }
}

function requireConnectionString(source: DatabaseConnectionSource): string {
  const connectionString = source.connectionString.trim()

  if (
    connectionString.length === 0 ||
    !/^postgres(?:ql)?:\/\//u.test(connectionString)
  ) {
    throw new DatabaseConfigurationError()
  }

  return connectionString
}

export async function withDatabase<T>(
  source: DatabaseConnectionSource,
  operation: DatabaseOperation<T>,
): Promise<T> {
  const client = new Client({
    connectionString: requireConnectionString(source),
  })

  try {
    await client.connect()
    return await operation(drizzle(client), client)
  } finally {
    await client.end()
  }
}

export async function selectOne(database: Database): Promise<boolean> {
  const result = await database.execute<{ value: number }>(
    sql`select 1::integer as value`,
  )

  return result.rows[0]?.value === 1
}

