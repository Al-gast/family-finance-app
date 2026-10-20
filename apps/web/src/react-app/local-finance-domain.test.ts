import { describe, expect, it } from 'vitest'
import {
  addBill,
  addTransaction,
  calculateSnapshot,
  createInitialFinanceState,
  deleteBill,
  deleteTransaction,
  editBill,
  editTransaction,
  getCycleRange,
  payBill,
  reopenBill,
  simulatePurchase,
  type LocalFinanceState,
  type MutationContext,
} from './local-finance-domain'

function contextFactory(now = '2026-10-20T10:00:00.000Z') {
  let sequence = 0
  return {
    id: () => `id-${++sequence}`,
    now,
    businessDate: '2026-10-20',
  } satisfies MutationContext
}

function stateFixture(context = contextFactory()): LocalFinanceState {
  return createInitialFinanceState(
    {
      familyName: 'Keluarga Uji',
      openingBalanceIdr: '4000000',
      paydayDay: 25,
      essentialBudgetIdr: '1500000',
      protectedReserveIdr: '300000',
      bills: [
        { name: 'Listrik', amountIdr: '300000', dueOn: '2026-10-21' },
        { name: 'Cicilan', amountIdr: '1400000', dueOn: '2026-10-23' },
      ],
    },
    context,
  )
}

describe('local finance domain', () => {
  it('clamps payday 31 to each month without carrying the clamped day forward', () => {
    expect(getCycleRange('2028-02-29', 31)).toMatchObject({
      cycleStart: '2028-02-29',
      nextPayday: '2028-03-31',
    })
    expect(getCycleRange('2027-02-28', 31)).toMatchObject({
      cycleStart: '2027-02-28',
      nextPayday: '2027-03-31',
    })
  })

  it('builds the expected real-data snapshot and preserves negative availability', () => {
    const snapshot = calculateSnapshot(stateFixture(), '2026-10-20')

    expect(snapshot).toMatchObject({
      balanceIdr: 4_000_000n,
      unpaidBillsIdr: 1_700_000n,
      remainingEssentialsIdr: 1_500_000n,
      protectedReserveIdr: 300_000n,
      availableToSpendIdr: 500_000n,
    })
    expect(simulatePurchase(snapshot, '750000')).toMatchObject({
      remainingAfterPurchaseIdr: -250_000n,
      shortfallIdr: 250_000n,
      withinPlan: false,
    })
  })

  it('does not double count a bill when it is paid and reopened', () => {
    const context = contextFactory()
    const initial = stateFixture(context)
    const before = calculateSnapshot(initial, '2026-10-20')
    const paid = payBill(initial, initial.bills[0]!.id, context)
    const afterPayment = calculateSnapshot(paid, '2026-10-20')

    expect(afterPayment.balanceIdr).toBe(before.balanceIdr - 300_000n)
    expect(afterPayment.unpaidBillsIdr).toBe(before.unpaidBillsIdr - 300_000n)
    expect(afterPayment.availableToSpendIdr).toBe(before.availableToSpendIdr)

    const reopened = reopenBill(paid, paid.bills[0]!.id, context)
    expect(calculateSnapshot(reopened, '2026-10-20')).toMatchObject({
      balanceIdr: before.balanceIdr,
      unpaidBillsIdr: before.unpaidBillsIdr,
      availableToSpendIdr: before.availableToSpendIdr,
    })
  })

  it('reduces balance and essential reserve once for essential spending', () => {
    const context = contextFactory()
    const initial = stateFixture(context)
    const before = calculateSnapshot(initial, '2026-10-20')
    const next = addTransaction(
      initial,
      {
        kind: 'expense',
        amountIdr: '100000',
        category: 'Belanja dapur',
        expenseType: 'essential',
        note: '',
        occurredOn: '2026-10-20',
      },
      context,
    )
    const after = calculateSnapshot(next, '2026-10-20')

    expect(after.balanceIdr).toBe(before.balanceIdr - 100_000n)
    expect(after.remainingEssentialsIdr).toBe(
      before.remainingEssentialsIdr - 100_000n,
    )
    expect(after.availableToSpendIdr).toBe(before.availableToSpendIdr)
  })

  it('reduces available money for discretionary spending', () => {
    const context = contextFactory()
    const initial = stateFixture(context)
    const next = addTransaction(
      initial,
      {
        kind: 'expense',
        amountIdr: '100000',
        category: 'Hiburan',
        expenseType: 'discretionary',
        note: '',
        occurredOn: '2026-10-20',
      },
      context,
    )

    expect(calculateSnapshot(next, '2026-10-20').availableToSpendIdr).toBe(
      400_000n,
    )
  })

  it('scopes essential spending and bill reservations to the active cycle', () => {
    const context = contextFactory()
    let state = stateFixture(context)
    state = addTransaction(
      state,
      {
        kind: 'expense',
        amountIdr: '100000',
        category: 'Belanja dapur',
        expenseType: 'essential',
        note: '',
        occurredOn: '2026-09-24',
      },
      context,
    )
    state = addBill(
      state,
      { name: 'Tagihan bulan depan', amountIdr: '500000', dueOn: '2026-10-25' },
      context,
    )

    const snapshot = calculateSnapshot(state, '2026-10-20')
    expect(snapshot.essentialSpentIdr).toBe(0n)
    expect(snapshot.remainingEssentialsIdr).toBe(1_500_000n)
    expect(snapshot.unpaidBillsIdr).toBe(1_700_000n)
  })

  it('supports unpaid bill CRUD and protects paid bill history', () => {
    const context = contextFactory()
    const initial = stateFixture(context)
    const added = addBill(
      initial,
      { name: 'Internet', amountIdr: '400000', dueOn: '2026-10-22' },
      context,
    )
    const billId = added.bills.at(-1)!.id
    const edited = editBill(
      added,
      billId,
      { name: 'Internet rumah', amountIdr: '450000', dueOn: '2026-10-24' },
      context,
    )
    expect(edited.bills.at(-1)).toMatchObject({
      name: 'Internet rumah',
      amountIdr: '450000',
    })

    const paid = payBill(edited, billId, context)
    expect(() => deleteBill(paid, billId, context)).toThrow(
      'sudah dibayar',
    )
    const reopened = reopenBill(paid, billId, context)
    expect(deleteBill(reopened, billId, context).bills).toHaveLength(2)
  })

  it('implements edit and delete as immutable reversal events', () => {
    const context = contextFactory()
    const created = addTransaction(
      stateFixture(context),
      {
        kind: 'income',
        amountIdr: '100000',
        category: 'Pemasukan',
        expenseType: null,
        note: '',
        occurredOn: '2026-10-20',
      },
      context,
    )
    const originalId = created.transactions[0]!.id
    const edited = editTransaction(
      created,
      originalId,
      {
        kind: 'income',
        amountIdr: '250000',
        category: 'Pemasukan',
        expenseType: null,
        note: 'Koreksi',
        occurredOn: '2026-10-20',
      },
      context,
    )

    expect(edited.transactions).toHaveLength(3)
    expect(edited.transactions.find(({ id }) => id === originalId)?.reversedAt).toBeTruthy()
    expect(calculateSnapshot(edited, '2026-10-20').balanceIdr).toBe(4_250_000n)

    const replacement = edited.transactions.find(
      ({ kind, reversedAt }) => kind === 'income' && !reversedAt,
    )!
    const deleted = deleteTransaction(edited, replacement.id, context)
    expect(deleted.transactions).toHaveLength(4)
    expect(calculateSnapshot(deleted, '2026-10-20').balanceIdr).toBe(4_000_000n)
  })

  it('rejects an expense that would make real cash negative', () => {
    const context = contextFactory()
    expect(() =>
      addTransaction(
        stateFixture(context),
        {
          kind: 'expense',
          amountIdr: '4000001',
          category: 'Lainnya',
          expenseType: 'discretionary',
          note: '',
          occurredOn: '2026-10-20',
        },
        context,
      ),
    ).toThrow('Saldo bersama tidak cukup')
  })
})

