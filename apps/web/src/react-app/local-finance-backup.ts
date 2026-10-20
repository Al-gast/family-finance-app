import {
  assertLocalFinanceState,
  type LocalFinanceState,
} from './local-finance-domain'

const BACKUP_FORMAT = 'family-finance-local-v0.2'

export function createFinanceBackup(
  state: LocalFinanceState,
  exportedAt = new Date().toISOString(),
) {
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      exportedAt,
      data: state,
    },
    null,
    2,
  )
}

export function parseFinanceBackup(contents: string) {
  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    throw new Error('File bukan JSON yang valid.')
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    !('format' in value) ||
    value.format !== BACKUP_FORMAT ||
    !('data' in value)
  ) {
    throw new Error('Format cadangan tidak dikenali.')
  }

  return assertLocalFinanceState(value.data)
}

