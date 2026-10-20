import {
  assertLocalFinanceState,
  type LocalFinanceState,
} from './local-finance-domain'

const DATABASE_NAME = 'family-finance-local-v0.2'
const DATABASE_VERSION = 1
const STORE_NAME = 'finance-state'
const CURRENT_STATE_KEY = 'current'

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), {
      once: true,
    })
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('Operasi IndexedDB gagal.')),
      { once: true },
    )
  })
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true })
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('Transaksi IndexedDB dibatalkan.')),
      { once: true },
    )
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('Transaksi IndexedDB gagal.')),
      { once: true },
    )
  })
}

function openDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(
      new Error('Browser ini tidak menyediakan penyimpanan IndexedDB.'),
    )
  }

  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
  request.addEventListener('upgradeneeded', () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME)
    }
  })
  return requestResult(request)
}

export async function loadFinanceState() {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const completed = transactionComplete(transaction)
    const value = await requestResult(
      transaction.objectStore(STORE_NAME).get(CURRENT_STATE_KEY),
    )
    await completed
    return value === undefined ? null : assertLocalFinanceState(value)
  } finally {
    database.close()
  }
}

export async function saveFinanceState(state: LocalFinanceState) {
  const checked = assertLocalFinanceState(state)
  const database = await openDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const completed = transactionComplete(transaction)
    transaction.objectStore(STORE_NAME).put(checked, CURRENT_STATE_KEY)
    await completed
  } finally {
    database.close()
  }
}

