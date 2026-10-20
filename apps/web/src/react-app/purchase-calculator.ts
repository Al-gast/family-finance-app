export type PurchaseCalculationInput = {
  balance: number
  unpaidBills: number
  remainingEssentials: number
  protectedReserve: number
  purchasePrice: number
}

export type PurchaseCalculation = PurchaseCalculationInput & {
  availableToSpend: number
  remainingAfterPurchase: number
}

const fieldLabels: Record<keyof PurchaseCalculationInput, string> = {
  balance: 'Saldo keluarga saat ini',
  unpaidBills: 'Tagihan belum dibayar',
  remainingEssentials: 'Kebutuhan pokok tersisa',
  protectedReserve: 'Dana cadangan terlindungi',
  purchasePrice: 'Harga barang',
}

const minimumSafeInteger = BigInt(Number.MIN_SAFE_INTEGER)
const maximumSafeInteger = BigInt(Number.MAX_SAFE_INTEGER)

function assertValidAmount(
  field: keyof PurchaseCalculationInput,
  value: number,
) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `${fieldLabels[field]} harus berupa bilangan bulat IDR nonnegatif yang aman.`,
    )
  }
}

function toSafeNumber(value: bigint) {
  if (value < minimumSafeInteger || value > maximumSafeInteger) {
    throw new RangeError('Hasil perhitungan berada di luar rentang integer aman.')
  }

  return Number(value)
}

export function calculatePurchase(
  input: PurchaseCalculationInput,
): PurchaseCalculation {
  for (const field of Object.keys(input) as Array<
    keyof PurchaseCalculationInput
  >) {
    assertValidAmount(field, input[field])
  }

  const availableToSpend =
    BigInt(input.balance) -
    BigInt(input.unpaidBills) -
    BigInt(input.remainingEssentials) -
    BigInt(input.protectedReserve)
  const remainingAfterPurchase = availableToSpend - BigInt(input.purchasePrice)

  return {
    ...input,
    availableToSpend: toSafeNumber(availableToSpend),
    remainingAfterPurchase: toSafeNumber(remainingAfterPurchase),
  }
}
