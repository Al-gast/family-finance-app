import { describe, expect, it, vi } from 'vitest'
import {
  DatabaseConfigurationError,
  withDatabase,
} from './client'

describe('withDatabase', () => {
  it.each(['', '   ', 'https://example.com/database'])(
    'rejects an invalid connection string without invoking the operation',
    async (connectionString) => {
      const operation = vi.fn()

      await expect(
        withDatabase({ connectionString }, operation),
      ).rejects.toBeInstanceOf(DatabaseConfigurationError)
      expect(operation).not.toHaveBeenCalled()
    },
  )
})

