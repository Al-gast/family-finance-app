export const LOCAL_DATA_VERSION = 1 as const
const MAX_IDR = 9_000_000_000_000_000_000n

export type ExpenseType = 'essential' | 'discretionary' | 'bill'
export type TransactionKind = 'income' | 'expense' | 'reversal'

export type LocalTransaction = {
  id: string
  kind: TransactionKind
  deltaIdr: string
  category: string
  expenseType: ExpenseType | null
  note: string
  occurredOn: string
  createdAt: string
  reversedAt: string | null
  reversalOfId: string | null
  billId: string | null
}

export type LocalBill = {
  id: string
  name: string
  amountIdr: string
  dueOn: string
  paidTransactionId: string | null
  createdAt: string
}

export type LocalFinanceState = {
  schemaVersion: typeof LOCAL_DATA_VERSION
  family: {
    name: string
    openingBalanceIdr: string
    paydayDay: number
    essentialBudgetIdr: string
    protectedReserveIdr: string
    createdAt: string
    balanceCheckedAt: string
    updatedAt: string
  }
  transactions: LocalTransaction[]
  bills: LocalBill[]
}

export type MutationContext = {
  id: () => string
  now: string
  businessDate: string
}

export type TransactionDraft = {
  kind: 'income' | 'expense'
  amountIdr: string
  category: string
  expenseType: Exclude<ExpenseType, 'bill'> | null
  note: string
  occurredOn: string
}

export type FinanceSnapshot = {
  balanceIdr: bigint
  unpaidBillsIdr: bigint
  essentialSpentIdr: bigint
  remainingEssentialsIdr: bigint
  protectedReserveIdr: bigint
  availableToSpendIdr: bigint
  cycleStart: string
  nextPayday: string
}

export type InitialFinanceInput = {
  familyName: string
  openingBalanceIdr: string
  paydayDay: number
  essentialBudgetIdr: string
  protectedReserveIdr: string
  bills: Array<{ name: string; amountIdr: string; dueOn: string }>
}

export function parseIdr(
  value: string,
  label = 'Nominal',
  options: { allowZero?: boolean } = {},
) {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) {
    throw new RangeError(`${label} harus berupa rupiah bulat nonnegatif.`)
  }

  const amount = BigInt(normalized)
  if (amount > MAX_IDR) {
    throw new RangeError(`${label} melebihi batas nominal yang didukung.`)
  }
  if (!options.allowZero && amount === 0n) {
    throw new RangeError(`${label} harus lebih dari Rp0.`)
  }

  return amount
}

export function toIdrString(value: bigint) {
  if (value < 0n || value > MAX_IDR) {
    throw new RangeError('Nominal harus berada dalam rentang IDR nonnegatif.')
  }
  return value.toString()
}

export function formatIdr(value: bigint | string) {
  const amount = typeof value === 'bigint' ? value : BigInt(value)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function isDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function assertDate(value: string, label: string) {
  if (!isDateString(value)) {
    throw new RangeError(`${label} tidak valid.`)
  }
}

function dateString(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  return `${year.toString().padStart(4, '0')}-${(monthIndex + 1)
    .toString()
    .padStart(2, '0')}-${Math.min(day, lastDay).toString().padStart(2, '0')}`
}

export function getCycleRange(today: string, paydayDay: number) {
  assertDate(today, 'Tanggal hari ini')
  if (!Number.isInteger(paydayDay) || paydayDay < 1 || paydayDay > 31) {
    throw new RangeError('Hari gajian harus antara 1 dan 31.')
  }

  const [year, month, day] = today.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const monthIndex = month - 1
  const thisPayday = dateString(year, monthIndex, paydayDay)
  const afterOrOnPayday = today >= thisPayday
  const startMonth = afterOrOnPayday ? monthIndex : monthIndex - 1
  const endMonth = afterOrOnPayday ? monthIndex + 1 : monthIndex

  const startDate = new Date(Date.UTC(year, startMonth, 1))
  const endDate = new Date(Date.UTC(year, endMonth, 1))

  return {
    cycleStart: dateString(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      paydayDay,
    ),
    nextPayday: dateString(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      paydayDay,
    ),
    day,
  }
}

function cloneState(state: LocalFinanceState): LocalFinanceState {
  return structuredClone(state)
}

function assertName(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} wajib diisi.`)
  if (value.trim().length > 80) throw new Error(`${label} terlalu panjang.`)
  return value.trim()
}

export function createInitialFinanceState(
  input: InitialFinanceInput,
  context: MutationContext,
) {
  const familyName = assertName(input.familyName, 'Nama keluarga')
  const openingBalanceIdr = toIdrString(
    parseIdr(input.openingBalanceIdr, 'Saldo awal', { allowZero: true }),
  )
  const essentialBudgetIdr = toIdrString(
    parseIdr(input.essentialBudgetIdr, 'Anggaran kebutuhan pokok', {
      allowZero: true,
    }),
  )
  const protectedReserveIdr = toIdrString(
    parseIdr(input.protectedReserveIdr, 'Dana cadangan', { allowZero: true }),
  )
  if (
    !Number.isInteger(input.paydayDay) ||
    input.paydayDay < 1 ||
    input.paydayDay > 31
  ) {
    throw new RangeError('Hari gajian harus antara 1 dan 31.')
  }

  const bills = input.bills.map((bill) => {
    assertDate(bill.dueOn, 'Tanggal jatuh tempo')
    return {
      id: context.id(),
      name: assertName(bill.name, 'Nama tagihan'),
      amountIdr: toIdrString(parseIdr(bill.amountIdr, 'Nominal tagihan')),
      dueOn: bill.dueOn,
      paidTransactionId: null,
      createdAt: context.now,
    }
  })

  return {
    schemaVersion: LOCAL_DATA_VERSION,
    family: {
      name: familyName,
      openingBalanceIdr,
      paydayDay: input.paydayDay,
      essentialBudgetIdr,
      protectedReserveIdr,
      createdAt: context.now,
      balanceCheckedAt: context.now,
      updatedAt: context.now,
    },
    transactions: [],
    bills,
  } satisfies LocalFinanceState
}

export function calculateSnapshot(
  state: LocalFinanceState,
  today: string,
): FinanceSnapshot {
  const { cycleStart, nextPayday } = getCycleRange(
    today,
    state.family.paydayDay,
  )
  const balanceIdr = state.transactions.reduce(
    (total, transaction) => total + BigInt(transaction.deltaIdr),
    BigInt(state.family.openingBalanceIdr),
  )
  const essentialSpentIdr = state.transactions.reduce((total, transaction) => {
    if (
      transaction.kind !== 'expense' ||
      transaction.expenseType !== 'essential' ||
      transaction.reversedAt ||
      transaction.occurredOn < cycleStart ||
      transaction.occurredOn >= nextPayday
    ) {
      return total
    }
    return total - BigInt(transaction.deltaIdr)
  }, 0n)
  const essentialBudgetIdr = BigInt(state.family.essentialBudgetIdr)
  const remainingEssentialsIdr =
    essentialBudgetIdr > essentialSpentIdr
      ? essentialBudgetIdr - essentialSpentIdr
      : 0n
  const unpaidBillsIdr = state.bills.reduce((total, bill) => {
    if (bill.paidTransactionId || bill.dueOn >= nextPayday) return total
    return total + BigInt(bill.amountIdr)
  }, 0n)
  const protectedReserveIdr = BigInt(state.family.protectedReserveIdr)

  return {
    balanceIdr,
    unpaidBillsIdr,
    essentialSpentIdr,
    remainingEssentialsIdr,
    protectedReserveIdr,
    availableToSpendIdr:
      balanceIdr -
      unpaidBillsIdr -
      remainingEssentialsIdr -
      protectedReserveIdr,
    cycleStart,
    nextPayday,
  }
}

function validateTransactionDraft(draft: TransactionDraft) {
  const amount = parseIdr(draft.amountIdr, 'Nominal transaksi')
  const category = assertName(draft.category, 'Kategori')
  assertDate(draft.occurredOn, 'Tanggal transaksi')
  if (draft.note.trim().length > 160) {
    throw new Error('Catatan maksimal 160 karakter.')
  }
  if (draft.kind === 'income' && draft.expenseType !== null) {
    throw new Error('Pemasukan tidak boleh memakai jenis pengeluaran.')
  }
  if (draft.kind === 'expense' && !draft.expenseType) {
    throw new Error('Jenis pengeluaran wajib dipilih.')
  }
  return { amount, category }
}

function ensureBalance(state: LocalFinanceState, delta: bigint) {
  const balance = calculateSnapshot(state, state.family.updatedAt.slice(0, 10))
    .balanceIdr
  if (balance + delta < 0n) {
    throw new Error('Saldo bersama tidak cukup untuk pengeluaran ini.')
  }
}

function appendTransaction(
  state: LocalFinanceState,
  draft: TransactionDraft,
  context: MutationContext,
) {
  const { amount, category } = validateTransactionDraft(draft)
  const delta = draft.kind === 'income' ? amount : -amount
  ensureBalance(state, delta)
  state.transactions.push({
    id: context.id(),
    kind: draft.kind,
    deltaIdr: delta.toString(),
    category,
    expenseType: draft.kind === 'expense' ? draft.expenseType : null,
    note: draft.note.trim(),
    occurredOn: draft.occurredOn,
    createdAt: context.now,
    reversedAt: null,
    reversalOfId: null,
    billId: null,
  })
}

export function addTransaction(
  current: LocalFinanceState,
  draft: TransactionDraft,
  context: MutationContext,
) {
  const state = cloneState(current)
  appendTransaction(state, draft, context)
  state.family.updatedAt = context.now
  return state
}

function reverseTransaction(
  state: LocalFinanceState,
  transaction: LocalTransaction,
  context: MutationContext,
) {
  if (transaction.kind === 'reversal' || transaction.reversedAt) {
    throw new Error('Transaksi ini tidak dapat dibatalkan lagi.')
  }
  transaction.reversedAt = context.now
  state.transactions.push({
    id: context.id(),
    kind: 'reversal',
    deltaIdr: (-BigInt(transaction.deltaIdr)).toString(),
    category: 'Koreksi',
    expenseType: null,
    note: `Pembatalan: ${transaction.category}`,
    occurredOn: transaction.occurredOn,
    createdAt: context.now,
    reversedAt: null,
    reversalOfId: transaction.id,
    billId: transaction.billId,
  })
}

export function editTransaction(
  current: LocalFinanceState,
  transactionId: string,
  draft: TransactionDraft,
  context: MutationContext,
) {
  const state = cloneState(current)
  const transaction = state.transactions.find(({ id }) => id === transactionId)
  if (!transaction) throw new Error('Transaksi tidak ditemukan.')
  if (transaction.billId) {
    throw new Error('Pembayaran tagihan hanya dapat diubah dari menu Tagihan.')
  }
  reverseTransaction(state, transaction, context)
  appendTransaction(state, draft, context)
  state.family.updatedAt = context.now
  return state
}

export function deleteTransaction(
  current: LocalFinanceState,
  transactionId: string,
  context: MutationContext,
) {
  const state = cloneState(current)
  const transaction = state.transactions.find(({ id }) => id === transactionId)
  if (!transaction) throw new Error('Transaksi tidak ditemukan.')
  if (transaction.billId) {
    throw new Error('Batalkan pembayaran melalui menu Tagihan.')
  }
  reverseTransaction(state, transaction, context)
  if (calculateSnapshot(state, context.businessDate).balanceIdr < 0n) {
    throw new Error(
      'Transaksi ini tidak dapat dihapus karena saldo akan menjadi negatif.',
    )
  }
  state.family.updatedAt = context.now
  return state
}

export function updatePlan(
  current: LocalFinanceState,
  input: {
    essentialBudgetIdr: string
    protectedReserveIdr: string
    paydayDay: number
  },
  context: MutationContext,
) {
  const state = cloneState(current)
  if (!Number.isInteger(input.paydayDay) || input.paydayDay < 1 || input.paydayDay > 31) {
    throw new RangeError('Hari gajian harus antara 1 dan 31.')
  }
  state.family.essentialBudgetIdr = toIdrString(
    parseIdr(input.essentialBudgetIdr, 'Anggaran kebutuhan pokok', {
      allowZero: true,
    }),
  )
  state.family.protectedReserveIdr = toIdrString(
    parseIdr(input.protectedReserveIdr, 'Dana cadangan', { allowZero: true }),
  )
  state.family.paydayDay = input.paydayDay
  state.family.updatedAt = context.now
  return state
}

export function addBill(
  current: LocalFinanceState,
  input: { name: string; amountIdr: string; dueOn: string },
  context: MutationContext,
) {
  const state = cloneState(current)
  assertDate(input.dueOn, 'Tanggal jatuh tempo')
  state.bills.push({
    id: context.id(),
    name: assertName(input.name, 'Nama tagihan'),
    amountIdr: toIdrString(parseIdr(input.amountIdr, 'Nominal tagihan')),
    dueOn: input.dueOn,
    paidTransactionId: null,
    createdAt: context.now,
  })
  state.family.updatedAt = context.now
  return state
}

export function editBill(
  current: LocalFinanceState,
  billId: string,
  input: { name: string; amountIdr: string; dueOn: string },
  context: MutationContext,
) {
  const state = cloneState(current)
  const bill = state.bills.find(({ id }) => id === billId)
  if (!bill) throw new Error('Tagihan tidak ditemukan.')
  if (bill.paidTransactionId) throw new Error('Batalkan pembayaran sebelum mengedit tagihan.')
  assertDate(input.dueOn, 'Tanggal jatuh tempo')
  bill.name = assertName(input.name, 'Nama tagihan')
  bill.amountIdr = toIdrString(parseIdr(input.amountIdr, 'Nominal tagihan'))
  bill.dueOn = input.dueOn
  state.family.updatedAt = context.now
  return state
}

export function deleteBill(
  current: LocalFinanceState,
  billId: string,
  context: MutationContext,
) {
  const state = cloneState(current)
  const bill = state.bills.find(({ id }) => id === billId)
  if (!bill) throw new Error('Tagihan tidak ditemukan.')
  if (bill.paidTransactionId) throw new Error('Tagihan yang sudah dibayar tidak dapat dihapus.')
  state.bills = state.bills.filter(({ id }) => id !== billId)
  state.family.updatedAt = context.now
  return state
}

export function payBill(
  current: LocalFinanceState,
  billId: string,
  context: MutationContext,
) {
  const state = cloneState(current)
  const bill = state.bills.find(({ id }) => id === billId)
  if (!bill) throw new Error('Tagihan tidak ditemukan.')
  if (bill.paidTransactionId) throw new Error('Tagihan ini sudah dibayar.')
  const delta = -BigInt(bill.amountIdr)
  ensureBalance(state, delta)
  const transactionId = context.id()
  state.transactions.push({
    id: transactionId,
    kind: 'expense',
    deltaIdr: delta.toString(),
    category: 'Tagihan',
    expenseType: 'bill',
    note: bill.name,
    occurredOn: context.businessDate,
    createdAt: context.now,
    reversedAt: null,
    reversalOfId: null,
    billId: bill.id,
  })
  bill.paidTransactionId = transactionId
  state.family.updatedAt = context.now
  return state
}

export function reopenBill(
  current: LocalFinanceState,
  billId: string,
  context: MutationContext,
) {
  const state = cloneState(current)
  const bill = state.bills.find(({ id }) => id === billId)
  if (!bill?.paidTransactionId) throw new Error('Tagihan belum dibayar.')
  const transaction = state.transactions.find(
    ({ id }) => id === bill.paidTransactionId,
  )
  if (!transaction) throw new Error('Transaksi pembayaran tagihan tidak ditemukan.')
  reverseTransaction(state, transaction, context)
  bill.paidTransactionId = null
  state.family.updatedAt = context.now
  return state
}

export function simulatePurchase(snapshot: FinanceSnapshot, purchaseIdr: string) {
  const purchase = parseIdr(purchaseIdr, 'Harga pembelian', { allowZero: true })
  const remainingAfterPurchaseIdr = snapshot.availableToSpendIdr - purchase
  return {
    purchaseIdr: purchase,
    availableToSpendIdr: snapshot.availableToSpendIdr,
    remainingAfterPurchaseIdr,
    shortfallIdr:
      remainingAfterPurchaseIdr < 0n ? -remainingAfterPurchaseIdr : 0n,
    withinPlan: remainingAfterPurchaseIdr >= 0n,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertLocalFinanceState(value: unknown): LocalFinanceState {
  if (!isRecord(value) || value.schemaVersion !== LOCAL_DATA_VERSION) {
    throw new Error('Versi data cadangan tidak didukung.')
  }
  if (
    !isRecord(value.family) ||
    !Array.isArray(value.transactions) ||
    !Array.isArray(value.bills)
  ) {
    throw new Error('Struktur data cadangan tidak valid.')
  }

  const family = value.family
  if (
    typeof family.name !== 'string' ||
    typeof family.openingBalanceIdr !== 'string' ||
    typeof family.essentialBudgetIdr !== 'string' ||
    typeof family.protectedReserveIdr !== 'string' ||
    typeof family.paydayDay !== 'number' ||
    typeof family.createdAt !== 'string' ||
    typeof family.balanceCheckedAt !== 'string' ||
    typeof family.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(family.createdAt)) ||
    !Number.isFinite(Date.parse(family.balanceCheckedAt)) ||
    !Number.isFinite(Date.parse(family.updatedAt))
  ) {
    throw new Error('Pengaturan keluarga dalam cadangan tidak valid.')
  }

  const state = value as unknown as LocalFinanceState
  assertName(state.family.name, 'Nama keluarga')
  parseIdr(state.family.openingBalanceIdr, 'Saldo awal', { allowZero: true })
  parseIdr(state.family.essentialBudgetIdr, 'Anggaran kebutuhan pokok', {
    allowZero: true,
  })
  parseIdr(state.family.protectedReserveIdr, 'Dana cadangan', {
    allowZero: true,
  })
  getCycleRange(state.family.updatedAt.slice(0, 10), state.family.paydayDay)

  const transactionIds = new Set<string>()
  for (const candidate of value.transactions) {
    if (!isRecord(candidate)) {
      throw new Error('Struktur transaksi tidak valid.')
    }
    if (
      typeof candidate.id !== 'string' ||
      !candidate.id ||
      transactionIds.has(candidate.id)
    ) {
      throw new Error('ID transaksi tidak valid atau duplikat.')
    }
    transactionIds.add(candidate.id)
    if (
      typeof candidate.kind !== 'string' ||
      !['income', 'expense', 'reversal'].includes(candidate.kind)
    ) {
      throw new Error('Jenis transaksi tidak valid.')
    }
    if (
      typeof candidate.deltaIdr !== 'string' ||
      !/^-?\d+$/.test(candidate.deltaIdr) ||
      BigInt(candidate.deltaIdr) === 0n
    ) {
      throw new Error('Nominal transaksi tidak valid.')
    }
    if (
      BigInt(candidate.deltaIdr) > MAX_IDR ||
      BigInt(candidate.deltaIdr) < -MAX_IDR
    ) {
      throw new Error('Nominal transaksi melebihi batas.')
    }
    if (
      typeof candidate.category !== 'string' ||
      typeof candidate.note !== 'string' ||
      typeof candidate.occurredOn !== 'string' ||
      typeof candidate.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(candidate.createdAt)) ||
      !(
        candidate.reversedAt === null ||
        (typeof candidate.reversedAt === 'string' &&
          Number.isFinite(Date.parse(candidate.reversedAt)))
      ) ||
      !(candidate.reversalOfId === null || typeof candidate.reversalOfId === 'string') ||
      !(candidate.billId === null || typeof candidate.billId === 'string') ||
      !(
        candidate.expenseType === null ||
        candidate.expenseType === 'essential' ||
        candidate.expenseType === 'discretionary' ||
        candidate.expenseType === 'bill'
      )
    ) {
      throw new Error('Detail transaksi tidak valid.')
    }
    assertName(candidate.category, 'Kategori transaksi')
    if (candidate.note.length > 160) {
      throw new Error('Catatan transaksi terlalu panjang.')
    }
    assertDate(candidate.occurredOn, 'Tanggal transaksi')
  }

  const billIds = new Set<string>()
  for (const candidate of value.bills) {
    if (!isRecord(candidate)) {
      throw new Error('Struktur tagihan tidak valid.')
    }
    if (
      typeof candidate.id !== 'string' ||
      !candidate.id ||
      billIds.has(candidate.id)
    ) {
      throw new Error('ID tagihan tidak valid atau duplikat.')
    }
    billIds.add(candidate.id)
    if (
      typeof candidate.name !== 'string' ||
      typeof candidate.amountIdr !== 'string' ||
      typeof candidate.dueOn !== 'string' ||
      typeof candidate.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(candidate.createdAt)) ||
      !(
        candidate.paidTransactionId === null ||
        typeof candidate.paidTransactionId === 'string'
      )
    ) {
      throw new Error('Detail tagihan tidak valid.')
    }
    assertName(candidate.name, 'Nama tagihan')
    parseIdr(candidate.amountIdr, 'Nominal tagihan')
    assertDate(candidate.dueOn, 'Tanggal jatuh tempo')
  }

  for (const bill of state.bills) {
    if (bill.paidTransactionId) {
      const payment = state.transactions.find(
        ({ id }) => id === bill.paidTransactionId,
      )
      if (
        !payment ||
        payment.billId !== bill.id ||
        payment.expenseType !== 'bill' ||
        payment.reversedAt ||
        payment.deltaIdr !== `-${bill.amountIdr}`
      ) {
        throw new Error('Relasi pembayaran tagihan tidak konsisten.')
      }
    }
  }

  for (const transaction of state.transactions) {
    if (transaction.kind === 'income') {
      if (
        BigInt(transaction.deltaIdr) <= 0n ||
        transaction.expenseType !== null ||
        transaction.reversalOfId !== null ||
        transaction.billId !== null
      ) {
        throw new Error('Pemasukan tidak konsisten.')
      }
    }
    if (transaction.kind === 'expense') {
      if (
        BigInt(transaction.deltaIdr) >= 0n ||
        !transaction.expenseType ||
        transaction.reversalOfId !== null ||
        (transaction.expenseType === 'bill') !== Boolean(transaction.billId)
      ) {
        throw new Error('Pengeluaran tidak konsisten.')
      }
    }
    if (transaction.kind === 'reversal') {
      const original = state.transactions.find(
        ({ id }) => id === transaction.reversalOfId,
      )
      if (
        !original ||
        original.kind === 'reversal' ||
        !original.reversedAt ||
        transaction.reversedAt !== null ||
        transaction.expenseType !== null ||
        transaction.deltaIdr !== (-BigInt(original.deltaIdr)).toString()
      ) {
        throw new Error('Relasi koreksi transaksi tidak konsisten.')
      }
    }

    if (transaction.kind !== 'reversal') {
      const reversals = state.transactions.filter(
        ({ reversalOfId }) => reversalOfId === transaction.id,
      )
      if (
        (transaction.reversedAt && reversals.length !== 1) ||
        (!transaction.reversedAt && reversals.length !== 0)
      ) {
        throw new Error('Status koreksi transaksi tidak konsisten.')
      }
    }

    if (
      transaction.kind === 'expense' &&
      transaction.expenseType === 'bill' &&
      !transaction.reversedAt
    ) {
      const bill = state.bills.find(({ id }) => id === transaction.billId)
      if (!bill || bill.paidTransactionId !== transaction.id) {
        throw new Error('Relasi pembayaran tagihan tidak konsisten.')
      }
    }
  }

  const checked = cloneState(state)
  if (
    calculateSnapshot(checked, checked.family.updatedAt.slice(0, 10))
      .balanceIdr < 0n
  ) {
    throw new Error('Data cadangan menghasilkan saldo negatif.')
  }
  return checked
}
