import { readFileSync } from 'node:fs'
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import {
  billOccurrences,
  budgetLines,
  categories,
  families,
  familyAccounts,
  financialCycles,
  financialMutations,
  recurringBills,
  transactions,
} from './schema'

function tableNames(tables: PgTable[]): string[] {
  return tables.map((table) => getTableConfig(table).name)
}

function constraintNames(table: PgTable): string[] {
  const config = getTableConfig(table)

  return [
    ...config.checks.map((constraint) => constraint.name),
    ...config.foreignKeys.map((constraint) => constraint.getName()),
    ...config.indexes.map((constraint) => constraint.config.name ?? ''),
    ...config.uniqueConstraints.map(
      (constraint) => constraint.getName() ?? '',
    ),
  ]
}

describe('financial schema', () => {
  it('contains only the M1.1 tenant root and financial tables', () => {
    expect(
      tableNames([
        families,
        familyAccounts,
        financialCycles,
        categories,
        budgetLines,
        recurringBills,
        billOccurrences,
        transactions,
        financialMutations,
      ]),
    ).toEqual([
      'families',
      'family_accounts',
      'financial_cycles',
      'categories',
      'budget_lines',
      'recurring_bills',
      'bill_occurrences',
      'transactions',
      'financial_mutations',
    ])
  })

  it('maps every IDR amount to PostgreSQL BIGINT and JavaScript bigint', () => {
    const amountColumns = [
      families.protectedReserveIdr,
      familyAccounts.balanceIdr,
      budgetLines.allocatedIdr,
      recurringBills.amountIdr,
      billOccurrences.amountIdr,
      transactions.deltaIdr,
    ]

    for (const column of amountColumns) {
      expect(column.getSQLType()).toBe('bigint')
      expect(column.dataType).toBe('bigint')
    }
  })

  it('declares the critical integrity and tenant-scope constraints', () => {
    expect(constraintNames(families)).toEqual(
      expect.arrayContaining([
        'families_name_not_blank_check',
        'families_payday_day_check',
        'families_protected_reserve_nonnegative_check',
      ]),
    )
    expect(constraintNames(financialCycles)).toEqual(
      expect.arrayContaining([
        'financial_cycles_period_check',
        'financial_cycles_family_starts_unique',
        'financial_cycles_one_active_per_family_idx',
      ]),
    )
    expect(constraintNames(billOccurrences)).toEqual(
      expect.arrayContaining([
        'bill_occurrences_payment_state_check',
        'bill_occurrences_paid_transaction_fk',
        'bill_occurrences_recurring_due_unique',
      ]),
    )
    expect(constraintNames(transactions)).toEqual(
      expect.arrayContaining([
        'transactions_expense_links_check',
        'transactions_delta_shape_check',
        'transactions_reversal_link_check',
        'transactions_bill_occurrence_fk',
      ]),
    )
    expect(constraintNames(financialMutations)).toContain(
      'financial_mutations_family_key_unique',
    )
  })

  it('has a generated, versioned migration with no auth or payment tables', () => {
    const migration = readFileSync(
      new URL('../drizzle/0001_m1_financial_schema.sql', import.meta.url),
      'utf8',
    )

    for (const tableName of tableNames([
      families,
      familyAccounts,
      financialCycles,
      categories,
      budgetLines,
      recurringBills,
      billOccurrences,
      transactions,
      financialMutations,
    ])) {
      expect(migration).toContain(`CREATE TABLE "${tableName}"`)
    }

    expect(migration).not.toMatch(
      /CREATE TABLE "(?:family_members|family_invitations|payments|webhook_events|entitlements)"/u,
    )

    const cycleConstraintMigration = readFileSync(
      new URL('../drizzle/0002_m1_cycle_non_overlap.sql', import.meta.url),
      'utf8',
    )

    expect(cycleConstraintMigration).toContain(
      'CONSTRAINT "financial_cycles_family_period_exclusion"',
    )
    expect(cycleConstraintMigration).toContain('EXCLUDE USING gist')
  })
})
