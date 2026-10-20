import { describe, expect, it } from 'vitest'
import { createFinanceBackup, parseFinanceBackup } from './local-finance-backup'
import { createInitialFinanceState } from './local-finance-domain'

function fixture() {
  return createInitialFinanceState(
    {
      familyName: 'Keluarga Backup',
      openingBalanceIdr: '9007199254740993',
      paydayDay: 31,
      essentialBudgetIdr: '1500000',
      protectedReserveIdr: '300000',
      bills: [
        { name: 'Internet', amountIdr: '450000', dueOn: '2026-10-28' },
      ],
    },
    {
      id: () => 'bill-1',
      now: '2026-10-20T10:00:00.000Z',
      businessDate: '2026-10-20',
    },
  )
}

describe('local finance backup', () => {
  it('round-trips decimal-string IDR without precision loss', () => {
    const state = fixture()
    const restored = parseFinanceBackup(
      createFinanceBackup(state, '2026-10-20T11:00:00.000Z'),
    )

    expect(restored).toEqual(state)
    expect(restored.family.openingBalanceIdr).toBe('9007199254740993')
  })

  it('rejects malformed and inconsistent backups', () => {
    expect(() => parseFinanceBackup('{nope')).toThrow('bukan JSON')

    const parsed = JSON.parse(createFinanceBackup(fixture())) as {
      data: { bills: Array<{ paidTransactionId: string | null }> }
    }
    parsed.data.bills[0]!.paidTransactionId = 'missing'
    expect(() => parseFinanceBackup(JSON.stringify(parsed))).toThrow(
      'Relasi pembayaran tagihan tidak konsisten',
    )
  })
})

