import { describe, expect, it } from 'vitest'
import { calculatePurchase } from './purchase-calculator'

describe('calculatePurchase', () => {
  it('preserves a zero balance result', () => {
    expect(
      calculatePurchase({
        balance: 0,
        unpaidBills: 0,
        remainingEssentials: 0,
        protectedReserve: 0,
        purchasePrice: 0,
      }),
    ).toMatchObject({ availableToSpend: 0, remainingAfterPurchase: 0 })
  })

  it('returns zero at the exact purchase boundary', () => {
    expect(
      calculatePurchase({
        balance: 1_000_000,
        unpaidBills: 250_000,
        remainingEssentials: 300_000,
        protectedReserve: 200_000,
        purchasePrice: 250_000,
      }).remainingAfterPurchase,
    ).toBe(0)
  })

  it('preserves a deficit as a negative result', () => {
    expect(
      calculatePurchase({
        balance: 500_000,
        unpaidBills: 200_000,
        remainingEssentials: 200_000,
        protectedReserve: 100_000,
        purchasePrice: 150_000,
      }),
    ).toMatchObject({ availableToSpend: 0, remainingAfterPurchase: -150_000 })
  })

  it('calculates large safe integer values without losing precision', () => {
    expect(
      calculatePurchase({
        balance: Number.MAX_SAFE_INTEGER,
        unpaidBills: 1,
        remainingEssentials: 2,
        protectedReserve: 3,
        purchasePrice: 4,
      }).remainingAfterPurchase,
    ).toBe(Number.MAX_SAFE_INTEGER - 10)
  })

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['unsafe', Number.MAX_SAFE_INTEGER + 1],
    ['not-a-number', Number.NaN],
  ])('rejects a %s amount', (_case, invalidAmount) => {
    expect(() =>
      calculatePurchase({
        balance: invalidAmount,
        unpaidBills: 0,
        remainingEssentials: 0,
        protectedReserve: 0,
        purchasePrice: 0,
      }),
    ).toThrow(RangeError)
  })
})
