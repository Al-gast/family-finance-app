import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type PgTableExtraConfigValue,
} from 'drizzle-orm/pg-core'

export const familyStatusEnum = pgEnum('family_status', [
  'pending_payment',
  'pending_setup',
  'active',
  'suspended',
])

export const financialCycleStatusEnum = pgEnum('financial_cycle_status', [
  'active',
  'closed',
])

export const categoryKindEnum = pgEnum('category_kind', [
  'income',
  'expense',
])

export const budgetKindEnum = pgEnum('budget_kind', ['essential'])

export const billOccurrenceStatusEnum = pgEnum('bill_occurrence_status', [
  'unpaid',
  'paid',
])

export const transactionKindEnum = pgEnum('transaction_kind', [
  'opening_balance',
  'income',
  'expense',
  'reconciliation',
  'reversal',
])

export const transactionExpenseTypeEnum = pgEnum(
  'transaction_expense_type',
  ['essential', 'bill', 'discretionary'],
)

export const families = pgTable(
  'families',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    status: familyStatusEnum('status').default('pending_payment').notNull(),
    paydayDay: smallint('payday_day'),
    protectedReserveIdr: bigint('protected_reserve_idr', {
      mode: 'bigint',
    })
      .default(sql`0`)
      .notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    check('families_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check(
      'families_payday_day_check',
      sql`${table.paydayDay} is null or ${table.paydayDay} between 1 and 31`,
    ),
    check(
      'families_active_payday_check',
      sql`${table.status} <> 'active' or ${table.paydayDay} is not null`,
    ),
    check(
      'families_protected_reserve_nonnegative_check',
      sql`${table.protectedReserveIdr} >= 0`,
    ),
  ],
)

export const familyAccounts = pgTable(
  'family_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    balanceIdr: bigint('balance_idr', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    version: bigint('version', { mode: 'bigint' }).default(sql`0`).notNull(),
    lastReconciledAt: timestamp('last_reconciled_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('family_accounts_family_id_unique').on(table.familyId),
    unique('family_accounts_family_id_id_unique').on(
      table.familyId,
      table.id,
    ),
    check(
      'family_accounts_balance_nonnegative_check',
      sql`${table.balanceIdr} >= 0`,
    ),
    check(
      'family_accounts_version_nonnegative_check',
      sql`${table.version} >= 0`,
    ),
  ],
)

export const financialCycles = pgTable(
  'financial_cycles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    startsOn: date('starts_on', { mode: 'string' }).notNull(),
    nextPaydayOn: date('next_payday_on', { mode: 'string' }).notNull(),
    status: financialCycleStatusEnum('status').default('active').notNull(),
    budgetReviewedAt: timestamp('budget_reviewed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('financial_cycles_family_id_id_unique').on(
      table.familyId,
      table.id,
    ),
    unique('financial_cycles_family_starts_unique').on(
      table.familyId,
      table.startsOn,
    ),
    uniqueIndex('financial_cycles_one_active_per_family_idx')
      .on(table.familyId)
      .where(sql`${table.status} = 'active'`),
    index('financial_cycles_family_next_payday_idx').on(
      table.familyId,
      table.nextPaydayOn,
    ),
    check(
      'financial_cycles_period_check',
      sql`${table.startsOn} < ${table.nextPaydayOn}`,
    ),
  ],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
    kind: categoryKindEnum('kind').notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('categories_family_id_id_unique').on(table.familyId, table.id),
    unique('categories_family_code_unique').on(table.familyId, table.code),
    index('categories_family_kind_active_idx').on(
      table.familyId,
      table.kind,
      table.active,
    ),
    check(
      'categories_code_format_check',
      sql`${table.code} ~ '^[a-z][a-z0-9_]*$'`,
    ),
    check(
      'categories_label_not_blank_check',
      sql`btrim(${table.label}) <> ''`,
    ),
  ],
)

export const budgetLines = pgTable(
  'budget_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    cycleId: uuid('cycle_id').notNull(),
    label: text('label').notNull(),
    allocatedIdr: bigint('allocated_idr', { mode: 'bigint' }).notNull(),
    kind: budgetKindEnum('kind').default('essential').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('budget_lines_family_id_id_unique').on(table.familyId, table.id),
    uniqueIndex('budget_lines_family_cycle_label_unique').on(
      table.familyId,
      table.cycleId,
      sql`lower(${table.label})`,
    ),
    index('budget_lines_family_cycle_idx').on(table.familyId, table.cycleId),
    foreignKey({
      name: 'budget_lines_family_cycle_fk',
      columns: [table.familyId, table.cycleId],
      foreignColumns: [financialCycles.familyId, financialCycles.id],
    }).onDelete('restrict'),
    check(
      'budget_lines_label_not_blank_check',
      sql`btrim(${table.label}) <> ''`,
    ),
    check(
      'budget_lines_allocated_nonnegative_check',
      sql`${table.allocatedIdr} >= 0`,
    ),
  ],
)

export const recurringBills = pgTable(
  'recurring_bills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    amountIdr: bigint('amount_idr', { mode: 'bigint' }).notNull(),
    dueDay: smallint('due_day').notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('recurring_bills_family_id_id_unique').on(
      table.familyId,
      table.id,
    ),
    index('recurring_bills_family_active_idx').on(
      table.familyId,
      table.active,
    ),
    check(
      'recurring_bills_name_not_blank_check',
      sql`btrim(${table.name}) <> ''`,
    ),
    check(
      'recurring_bills_amount_positive_check',
      sql`${table.amountIdr} > 0`,
    ),
    check(
      'recurring_bills_due_day_check',
      sql`${table.dueDay} between 1 and 31`,
    ),
  ],
)

export const billOccurrences = pgTable(
  'bill_occurrences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    recurringBillId: uuid('recurring_bill_id'),
    name: text('name').notNull(),
    dueOn: date('due_on', { mode: 'string' }).notNull(),
    amountIdr: bigint('amount_idr', { mode: 'bigint' }).notNull(),
    status: billOccurrenceStatusEnum('status').default('unpaid').notNull(),
    paidTransactionId: uuid('paid_transaction_id'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    unique('bill_occurrences_family_id_id_unique').on(
      table.familyId,
      table.id,
    ),
    unique('bill_occurrences_paid_transaction_unique').on(
      table.paidTransactionId,
    ),
    uniqueIndex('bill_occurrences_recurring_due_unique')
      .on(table.recurringBillId, table.dueOn)
      .where(sql`${table.recurringBillId} is not null`),
    index('bill_occurrences_family_status_due_idx').on(
      table.familyId,
      table.status,
      table.dueOn,
    ),
    foreignKey({
      name: 'bill_occurrences_family_recurring_bill_fk',
      columns: [table.familyId, table.recurringBillId],
      foreignColumns: [recurringBills.familyId, recurringBills.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'bill_occurrences_paid_transaction_fk',
      columns: [table.familyId, table.id, table.paidTransactionId],
      foreignColumns: [
        transactions.familyId,
        transactions.billOccurrenceId,
        transactions.id,
      ],
    }).onDelete('restrict'),
    check(
      'bill_occurrences_name_not_blank_check',
      sql`btrim(${table.name}) <> ''`,
    ),
    check(
      'bill_occurrences_amount_positive_check',
      sql`${table.amountIdr} > 0`,
    ),
    check(
      'bill_occurrences_payment_state_check',
      sql`(
        ${table.status} = 'paid' and ${table.paidTransactionId} is not null
      ) or (
        ${table.status} = 'unpaid' and ${table.paidTransactionId} is null
      )`,
    ),
  ],
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id').notNull(),
    cycleId: uuid('cycle_id').notNull(),
    categoryId: uuid('category_id'),
    occurredOn: date('occurred_on', { mode: 'string' }).notNull(),
    kind: transactionKindEnum('kind').notNull(),
    expenseType: transactionExpenseTypeEnum('expense_type'),
    deltaIdr: bigint('delta_idr', { mode: 'bigint' }).notNull(),
    budgetLineId: uuid('budget_line_id'),
    billOccurrenceId: uuid('bill_occurrence_id'),
    reversalOfId: uuid('reversal_of_id'),
    reversedAt: timestamp('reversed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    note: text('note'),
    createdByAuthUserId: text('created_by_auth_user_id').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    unique('transactions_family_account_id_unique').on(
      table.familyId,
      table.accountId,
      table.id,
    ),
    unique('transactions_family_bill_id_unique').on(
      table.familyId,
      table.billOccurrenceId,
      table.id,
    ),
    unique('transactions_reversal_of_unique').on(table.reversalOfId),
    index('transactions_family_occurred_created_idx').on(
      table.familyId,
      table.occurredOn,
      table.createdAt,
    ),
    index('transactions_family_cycle_idx').on(table.familyId, table.cycleId),
    index('transactions_family_category_idx').on(
      table.familyId,
      table.categoryId,
    ),
    foreignKey({
      name: 'transactions_family_account_fk',
      columns: [table.familyId, table.accountId],
      foreignColumns: [familyAccounts.familyId, familyAccounts.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'transactions_family_cycle_fk',
      columns: [table.familyId, table.cycleId],
      foreignColumns: [financialCycles.familyId, financialCycles.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'transactions_family_category_fk',
      columns: [table.familyId, table.categoryId],
      foreignColumns: [categories.familyId, categories.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'transactions_family_budget_line_fk',
      columns: [table.familyId, table.budgetLineId],
      foreignColumns: [budgetLines.familyId, budgetLines.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'transactions_bill_occurrence_fk',
      columns: [table.familyId, table.billOccurrenceId],
      foreignColumns: [billOccurrences.familyId, billOccurrences.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'transactions_reversal_of_fk',
      columns: [table.familyId, table.accountId, table.reversalOfId],
      foreignColumns: [table.familyId, table.accountId, table.id],
    }).onDelete('restrict'),
    check(
      'transactions_created_by_not_blank_check',
      sql`btrim(${table.createdByAuthUserId}) <> ''`,
    ),
    check(
      'transactions_delta_shape_check',
      sql`(
        ${table.kind} in ('opening_balance', 'income')
        and ${table.deltaIdr} > 0
        and ${table.expenseType} is null
      ) or (
        ${table.kind} = 'expense'
        and ${table.deltaIdr} < 0
        and ${table.expenseType} is not null
      ) or (
        ${table.kind} in ('reconciliation', 'reversal')
        and ${table.deltaIdr} <> 0
        and ${table.expenseType} is null
      )`,
    ),
    check(
      'transactions_category_link_check',
      sql`(
        ${table.kind} in ('income', 'expense')
        and ${table.categoryId} is not null
      ) or (
        ${table.kind} not in ('income', 'expense')
        and ${table.categoryId} is null
      )`,
    ),
    check(
      'transactions_expense_links_check',
      sql`(
        ${table.expenseType} = 'essential'
        and ${table.budgetLineId} is not null
        and ${table.billOccurrenceId} is null
      ) or (
        ${table.expenseType} = 'bill'
        and ${table.budgetLineId} is null
        and ${table.billOccurrenceId} is not null
      ) or (
        ${table.expenseType} = 'discretionary'
        and ${table.budgetLineId} is null
        and ${table.billOccurrenceId} is null
      ) or (
        ${table.expenseType} is null
        and ${table.budgetLineId} is null
        and ${table.billOccurrenceId} is null
      )`,
    ),
    check(
      'transactions_reversal_link_check',
      sql`(${table.kind} = 'reversal') = (${table.reversalOfId} is not null)`,
    ),
    check(
      'transactions_reversal_not_self_check',
      sql`${table.reversalOfId} is null or ${table.id} <> ${table.reversalOfId}`,
    ),
  ],
)

export const financialMutations = pgTable(
  'financial_mutations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'restrict' }),
    actorAuthUserId: text('actor_auth_user_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    resultType: text('result_type').notNull(),
    resultId: uuid('result_id').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('financial_mutations_family_key_unique').on(
      table.familyId,
      table.idempotencyKey,
    ),
    index('financial_mutations_family_created_idx').on(
      table.familyId,
      table.createdAt,
    ),
    check(
      'financial_mutations_actor_not_blank_check',
      sql`btrim(${table.actorAuthUserId}) <> ''`,
    ),
    check(
      'financial_mutations_key_not_blank_check',
      sql`btrim(${table.idempotencyKey}) <> ''`,
    ),
    check(
      'financial_mutations_request_hash_not_blank_check',
      sql`btrim(${table.requestHash}) <> ''`,
    ),
    check(
      'financial_mutations_result_type_not_blank_check',
      sql`btrim(${table.resultType}) <> ''`,
    ),
  ],
)

export const familiesRelations = relations(families, ({ many, one }) => ({
  account: one(familyAccounts),
  cycles: many(financialCycles),
  categories: many(categories),
  budgetLines: many(budgetLines),
  recurringBills: many(recurringBills),
  billOccurrences: many(billOccurrences),
  transactions: many(transactions),
  financialMutations: many(financialMutations),
}))

export const familyAccountsRelations = relations(
  familyAccounts,
  ({ many, one }) => ({
    family: one(families, {
      fields: [familyAccounts.familyId],
      references: [families.id],
    }),
    transactions: many(transactions),
  }),
)

export const financialCyclesRelations = relations(
  financialCycles,
  ({ many, one }) => ({
    family: one(families, {
      fields: [financialCycles.familyId],
      references: [families.id],
    }),
    budgetLines: many(budgetLines),
    transactions: many(transactions),
  }),
)

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  family: one(families, {
    fields: [categories.familyId],
    references: [families.id],
  }),
  transactions: many(transactions),
}))

export const budgetLinesRelations = relations(
  budgetLines,
  ({ many, one }) => ({
    family: one(families, {
      fields: [budgetLines.familyId],
      references: [families.id],
    }),
    cycle: one(financialCycles, {
      fields: [budgetLines.cycleId],
      references: [financialCycles.id],
    }),
    transactions: many(transactions),
  }),
)

export const recurringBillsRelations = relations(
  recurringBills,
  ({ many, one }) => ({
    family: one(families, {
      fields: [recurringBills.familyId],
      references: [families.id],
    }),
    occurrences: many(billOccurrences),
  }),
)

export const billOccurrencesRelations = relations(
  billOccurrences,
  ({ many, one }) => ({
    family: one(families, {
      fields: [billOccurrences.familyId],
      references: [families.id],
    }),
    recurringBill: one(recurringBills, {
      fields: [billOccurrences.recurringBillId],
      references: [recurringBills.id],
    }),
    settlementTransactions: many(transactions, {
      relationName: 'billSettlementTransactions',
    }),
    paidTransaction: one(transactions, {
      fields: [billOccurrences.paidTransactionId],
      references: [transactions.id],
      relationName: 'currentBillPaidTransaction',
    }),
  }),
)

export const transactionsRelations = relations(
  transactions,
  ({ many, one }) => ({
    family: one(families, {
      fields: [transactions.familyId],
      references: [families.id],
    }),
    account: one(familyAccounts, {
      fields: [transactions.accountId],
      references: [familyAccounts.id],
    }),
    cycle: one(financialCycles, {
      fields: [transactions.cycleId],
      references: [financialCycles.id],
    }),
    category: one(categories, {
      fields: [transactions.categoryId],
      references: [categories.id],
    }),
    budgetLine: one(budgetLines, {
      fields: [transactions.budgetLineId],
      references: [budgetLines.id],
    }),
    billOccurrence: one(billOccurrences, {
      fields: [transactions.billOccurrenceId],
      references: [billOccurrences.id],
      relationName: 'billSettlementTransactions',
    }),
    paidBillOccurrences: many(billOccurrences, {
      relationName: 'currentBillPaidTransaction',
    }),
    reversalOf: one(transactions, {
      fields: [transactions.reversalOfId],
      references: [transactions.id],
      relationName: 'transactionReversals',
    }),
    reversals: many(transactions, {
      relationName: 'transactionReversals',
    }),
  }),
)

export const financialMutationsRelations = relations(
  financialMutations,
  ({ one }) => ({
    family: one(families, {
      fields: [financialMutations.familyId],
      references: [families.id],
    }),
  }),
)
