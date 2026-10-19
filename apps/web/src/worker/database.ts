import {
  withDatabase,
  type DatabaseOperation,
} from '@family-finance/db'
import type { WorkerBindings } from './bindings'

export function withWorkerDatabase<T>(
  bindings: WorkerBindings,
  operation: DatabaseOperation<T>,
): Promise<T> {
  return withDatabase(bindings.DB_FRESH, operation)
}

