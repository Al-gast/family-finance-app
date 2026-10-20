import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { Client } from 'pg'
import { describe, expect, it } from 'vitest'
import { withDatabase } from '../src/client'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for the PostgreSQL integration test',
  )
}

type PostgresError = Error & {
  code?: string
  constraint?: string
}

async function expectConstraintViolation(
  client: Client,
  query: string,
  values: unknown[],
  constraint: string,
): Promise<void> {
  await client.query('savepoint constraint_assertion')

  try {
    await client.query(query, values)
  } catch (error) {
    await client.query('rollback to savepoint constraint_assertion')
    const postgresError = error as PostgresError

    expect(postgresError.code).toMatch(/^(?:23503|23505|23514|23P01)$/u)
    expect(postgresError.constraint).toBe(constraint)
    return
  }

  await client.query('rollback to savepoint constraint_assertion')
  throw new Error(`Expected PostgreSQL constraint ${constraint} to reject`)
}

describe('M1.1 financial schema migration', () => {
  it('enforces financial and tenant invariants in an isolated rollback', async () => {
    const schemaName = `m1_schema_${randomUUID().replaceAll('-', '')}`
    const migration = [
      readFileSync(
        new URL('../drizzle/0001_m1_financial_schema.sql', import.meta.url),
        'utf8',
      ),
      readFileSync(
        new URL('../drizzle/0002_m1_cycle_non_overlap.sql', import.meta.url),
        'utf8',
      ),
    ]
      .join('\n')
      .replaceAll('"public".', `"${schemaName}".`)

    await withDatabase(
      { connectionString: databaseUrl },
      async (_database, client) => {
        await client.query('begin')

        try {
          await client.query(`create schema "${schemaName}"`)
          await client.query(`set local search_path to "${schemaName}"`)
          await client.query(migration)

          const familyA = randomUUID()
          const familyB = randomUUID()
          const accountA = randomUUID()
          const cycleA = randomUUID()
          const categoryA = randomUUID()
          const categoryB = randomUUID()
          const budgetA = randomUUID()
          const recurringBillA = randomUUID()
          const billOccurrenceA = randomUUID()

          await client.query(
            `insert into families (id, name, status, payday_day)
             values ($1, 'Keluarga A', 'active', 25),
                    ($2, 'Keluarga B', 'active', 25)`,
            [familyA, familyB],
          )
          await client.query(
            `insert into family_accounts (id, family_id, balance_idr)
             values ($1, $2, 1000000)`,
            [accountA, familyA],
          )
          await client.query(
            `insert into financial_cycles
               (id, family_id, starts_on, next_payday_on, status)
             values ($1, $2, '2026-10-25', '2026-11-25', 'active')`,
            [cycleA, familyA],
          )
          await client.query(
            `insert into categories (id, family_id, code, label, kind)
             values ($1, $2, 'groceries', 'Belanja dapur', 'expense'),
                    ($3, $4, 'other', 'Lainnya', 'expense')`,
            [categoryA, familyA, categoryB, familyB],
          )
          await client.query(
            `insert into budget_lines
               (id, family_id, cycle_id, label, allocated_idr)
             values ($1, $2, $3, 'Kebutuhan pokok', 500000)`,
            [budgetA, familyA, cycleA],
          )
          await client.query(
            `insert into recurring_bills
               (id, family_id, name, amount_idr, due_day)
             values ($1, $2, 'Listrik', 300000, 20)`,
            [recurringBillA, familyA],
          )
          await client.query(
            `insert into bill_occurrences
               (id, family_id, recurring_bill_id, name, due_on, amount_idr)
             values ($1, $2, $3, 'Listrik', '2026-11-20', 300000)`,
            [billOccurrenceA, familyA, recurringBillA],
          )

          await expectConstraintViolation(
            client,
            `insert into family_accounts (family_id, balance_idr)
             values ($1, -1)`,
            [familyB],
            'family_accounts_balance_nonnegative_check',
          )
          await expectConstraintViolation(
            client,
            `insert into financial_cycles
               (family_id, starts_on, next_payday_on, status)
             values ($1, '2026-11-25', '2026-12-25', 'active')`,
            [familyA],
            'financial_cycles_one_active_per_family_idx',
          )
          await expectConstraintViolation(
            client,
            `insert into financial_cycles
               (family_id, starts_on, next_payday_on, status)
             values ($1, '2026-11-01', '2026-12-01', 'closed')`,
            [familyA],
            'financial_cycles_family_period_exclusion',
          )
          await expectConstraintViolation(
            client,
            `insert into budget_lines
               (family_id, cycle_id, label, allocated_idr)
             values ($1, $2, 'Lintas keluarga', 1)`,
            [familyB, cycleA],
            'budget_lines_family_cycle_fk',
          )
          await expectConstraintViolation(
            client,
            `insert into transactions
               (family_id, account_id, cycle_id, category_id, occurred_on,
                kind, expense_type, delta_idr, created_by_auth_user_id)
             values ($1, $2, $3, $4, '2026-10-26',
                     'expense', 'discretionary', 1000, 'auth-user-a')`,
            [familyA, accountA, cycleA, categoryA],
            'transactions_delta_shape_check',
          )
          await expectConstraintViolation(
            client,
            `insert into transactions
               (family_id, account_id, cycle_id, category_id, occurred_on,
                kind, expense_type, delta_idr, created_by_auth_user_id)
             values ($1, $2, $3, $4, '2026-10-26',
                     'expense', 'discretionary', -1000, 'auth-user-a')`,
            [familyA, accountA, cycleA, categoryB],
            'transactions_family_category_fk',
          )
          await expectConstraintViolation(
            client,
            `insert into bill_occurrences
               (family_id, name, due_on, amount_idr, status)
             values ($1, 'Invalid paid bill', '2026-11-21', 1000, 'paid')`,
            [familyA],
            'bill_occurrences_payment_state_check',
          )
          await expectConstraintViolation(
            client,
            `insert into bill_occurrences
               (family_id, recurring_bill_id, name, due_on, amount_idr)
             values ($1, $2, 'Duplicate listrik', '2026-11-20', 300000)`,
            [familyA, recurringBillA],
            'bill_occurrences_recurring_due_unique',
          )

          const settlementTransaction = randomUUID()
          await client.query(
            `insert into transactions
               (id, family_id, account_id, cycle_id, category_id, occurred_on,
                kind, expense_type, delta_idr, bill_occurrence_id,
                created_by_auth_user_id)
             values ($1, $2, $3, $4, $5, '2026-11-20',
                     'expense', 'bill', -300000, $6, 'auth-user-a')`,
            [
              settlementTransaction,
              familyA,
              accountA,
              cycleA,
              categoryA,
              billOccurrenceA,
            ],
          )
          await client.query(
            `update bill_occurrences
             set status = 'paid', paid_transaction_id = $1
             where id = $2`,
            [settlementTransaction, billOccurrenceA],
          )

          const unrelatedTransaction = randomUUID()
          await client.query(
            `insert into transactions
               (id, family_id, account_id, cycle_id, category_id, occurred_on,
                kind, expense_type, delta_idr, created_by_auth_user_id)
             values ($1, $2, $3, $4, $5, '2026-11-20',
                     'expense', 'discretionary', -1, 'auth-user-a')`,
            [unrelatedTransaction, familyA, accountA, cycleA, categoryA],
          )
          await expectConstraintViolation(
            client,
            `update bill_occurrences
             set paid_transaction_id = $1
             where id = $2`,
            [unrelatedTransaction, billOccurrenceA],
            'bill_occurrences_paid_transaction_fk',
          )

          await client.query(
            `insert into financial_mutations
               (family_id, actor_auth_user_id, idempotency_key,
                request_hash, result_type, result_id)
             values ($1, 'auth-user-a', 'same-key', 'request-hash',
                     'transaction', $2)`,
            [familyA, settlementTransaction],
          )
          await expectConstraintViolation(
            client,
            `insert into financial_mutations
               (family_id, actor_auth_user_id, idempotency_key,
                request_hash, result_type, result_id)
             values ($1, 'auth-user-a', 'same-key', 'request-hash',
                     'transaction', $2)`,
            [familyA, settlementTransaction],
            'financial_mutations_family_key_unique',
          )
        } finally {
          await client.query('rollback')
        }
      },
    )
  })
})
