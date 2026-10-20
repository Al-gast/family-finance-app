CREATE TYPE "public"."bill_occurrence_status" AS ENUM('unpaid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."budget_kind" AS ENUM('essential');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."family_status" AS ENUM('pending_payment', 'pending_setup', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."financial_cycle_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transaction_expense_type" AS ENUM('essential', 'bill', 'discretionary');--> statement-breakpoint
CREATE TYPE "public"."transaction_kind" AS ENUM('opening_balance', 'income', 'expense', 'reconciliation', 'reversal');--> statement-breakpoint
CREATE TABLE "bill_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"recurring_bill_id" uuid,
	"name" text NOT NULL,
	"due_on" date NOT NULL,
	"amount_idr" bigint NOT NULL,
	"status" "bill_occurrence_status" DEFAULT 'unpaid' NOT NULL,
	"paid_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bill_occurrences_family_id_id_unique" UNIQUE("family_id","id"),
	CONSTRAINT "bill_occurrences_paid_transaction_unique" UNIQUE("paid_transaction_id"),
	CONSTRAINT "bill_occurrences_name_not_blank_check" CHECK (btrim("bill_occurrences"."name") <> ''),
	CONSTRAINT "bill_occurrences_amount_positive_check" CHECK ("bill_occurrences"."amount_idr" > 0),
	CONSTRAINT "bill_occurrences_payment_state_check" CHECK ((
        "bill_occurrences"."status" = 'paid' and "bill_occurrences"."paid_transaction_id" is not null
      ) or (
        "bill_occurrences"."status" = 'unpaid' and "bill_occurrences"."paid_transaction_id" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"label" text NOT NULL,
	"allocated_idr" bigint NOT NULL,
	"kind" "budget_kind" DEFAULT 'essential' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_lines_family_id_id_unique" UNIQUE("family_id","id"),
	CONSTRAINT "budget_lines_label_not_blank_check" CHECK (btrim("budget_lines"."label") <> ''),
	CONSTRAINT "budget_lines_allocated_nonnegative_check" CHECK ("budget_lines"."allocated_idr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_family_id_id_unique" UNIQUE("family_id","id"),
	CONSTRAINT "categories_family_code_unique" UNIQUE("family_id","code"),
	CONSTRAINT "categories_code_format_check" CHECK ("categories"."code" ~ '^[a-z][a-z0-9_]*$'),
	CONSTRAINT "categories_label_not_blank_check" CHECK (btrim("categories"."label") <> '')
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "family_status" DEFAULT 'pending_payment' NOT NULL,
	"payday_day" smallint,
	"protected_reserve_idr" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_name_not_blank_check" CHECK (btrim("families"."name") <> ''),
	CONSTRAINT "families_payday_day_check" CHECK ("families"."payday_day" is null or "families"."payday_day" between 1 and 31),
	CONSTRAINT "families_active_payday_check" CHECK ("families"."status" <> 'active' or "families"."payday_day" is not null),
	CONSTRAINT "families_protected_reserve_nonnegative_check" CHECK ("families"."protected_reserve_idr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "family_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"balance_idr" bigint DEFAULT 0 NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"last_reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_accounts_family_id_unique" UNIQUE("family_id"),
	CONSTRAINT "family_accounts_family_id_id_unique" UNIQUE("family_id","id"),
	CONSTRAINT "family_accounts_balance_nonnegative_check" CHECK ("family_accounts"."balance_idr" >= 0),
	CONSTRAINT "family_accounts_version_nonnegative_check" CHECK ("family_accounts"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "financial_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"next_payday_on" date NOT NULL,
	"status" "financial_cycle_status" DEFAULT 'active' NOT NULL,
	"budget_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_cycles_family_id_id_unique" UNIQUE("family_id","id"),
	CONSTRAINT "financial_cycles_family_starts_unique" UNIQUE("family_id","starts_on"),
	CONSTRAINT "financial_cycles_period_check" CHECK ("financial_cycles"."starts_on" < "financial_cycles"."next_payday_on")
);
--> statement-breakpoint
CREATE TABLE "financial_mutations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"actor_auth_user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"result_type" text NOT NULL,
	"result_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_mutations_family_key_unique" UNIQUE("family_id","idempotency_key"),
	CONSTRAINT "financial_mutations_actor_not_blank_check" CHECK (btrim("financial_mutations"."actor_auth_user_id") <> ''),
	CONSTRAINT "financial_mutations_key_not_blank_check" CHECK (btrim("financial_mutations"."idempotency_key") <> ''),
	CONSTRAINT "financial_mutations_request_hash_not_blank_check" CHECK (btrim("financial_mutations"."request_hash") <> ''),
	CONSTRAINT "financial_mutations_result_type_not_blank_check" CHECK (btrim("financial_mutations"."result_type") <> '')
);
--> statement-breakpoint
CREATE TABLE "recurring_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount_idr" bigint NOT NULL,
	"due_day" smallint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_bills_family_id_id_unique" UNIQUE("family_id","id"),
	CONSTRAINT "recurring_bills_name_not_blank_check" CHECK (btrim("recurring_bills"."name") <> ''),
	CONSTRAINT "recurring_bills_amount_positive_check" CHECK ("recurring_bills"."amount_idr" > 0),
	CONSTRAINT "recurring_bills_due_day_check" CHECK ("recurring_bills"."due_day" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"category_id" uuid,
	"occurred_on" date NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"expense_type" "transaction_expense_type",
	"delta_idr" bigint NOT NULL,
	"budget_line_id" uuid,
	"bill_occurrence_id" uuid,
	"reversal_of_id" uuid,
	"reversed_at" timestamp with time zone,
	"note" text,
	"created_by_auth_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_family_account_id_unique" UNIQUE("family_id","account_id","id"),
	CONSTRAINT "transactions_family_bill_id_unique" UNIQUE("family_id","bill_occurrence_id","id"),
	CONSTRAINT "transactions_reversal_of_unique" UNIQUE("reversal_of_id"),
	CONSTRAINT "transactions_created_by_not_blank_check" CHECK (btrim("transactions"."created_by_auth_user_id") <> ''),
	CONSTRAINT "transactions_delta_shape_check" CHECK ((
        "transactions"."kind" in ('opening_balance', 'income')
        and "transactions"."delta_idr" > 0
        and "transactions"."expense_type" is null
      ) or (
        "transactions"."kind" = 'expense'
        and "transactions"."delta_idr" < 0
        and "transactions"."expense_type" is not null
      ) or (
        "transactions"."kind" in ('reconciliation', 'reversal')
        and "transactions"."delta_idr" <> 0
        and "transactions"."expense_type" is null
      )),
	CONSTRAINT "transactions_category_link_check" CHECK ((
        "transactions"."kind" in ('income', 'expense')
        and "transactions"."category_id" is not null
      ) or (
        "transactions"."kind" not in ('income', 'expense')
        and "transactions"."category_id" is null
      )),
	CONSTRAINT "transactions_expense_links_check" CHECK ((
        "transactions"."expense_type" = 'essential'
        and "transactions"."budget_line_id" is not null
        and "transactions"."bill_occurrence_id" is null
      ) or (
        "transactions"."expense_type" = 'bill'
        and "transactions"."budget_line_id" is null
        and "transactions"."bill_occurrence_id" is not null
      ) or (
        "transactions"."expense_type" = 'discretionary'
        and "transactions"."budget_line_id" is null
        and "transactions"."bill_occurrence_id" is null
      ) or (
        "transactions"."expense_type" is null
        and "transactions"."budget_line_id" is null
        and "transactions"."bill_occurrence_id" is null
      )),
	CONSTRAINT "transactions_reversal_link_check" CHECK (("transactions"."kind" = 'reversal') = ("transactions"."reversal_of_id" is not null)),
	CONSTRAINT "transactions_reversal_not_self_check" CHECK ("transactions"."reversal_of_id" is null or "transactions"."id" <> "transactions"."reversal_of_id")
);
--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_family_recurring_bill_fk" FOREIGN KEY ("family_id","recurring_bill_id") REFERENCES "public"."recurring_bills"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_occurrences" ADD CONSTRAINT "bill_occurrences_paid_transaction_fk" FOREIGN KEY ("family_id","id","paid_transaction_id") REFERENCES "public"."transactions"("family_id","bill_occurrence_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_family_cycle_fk" FOREIGN KEY ("family_id","cycle_id") REFERENCES "public"."financial_cycles"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_accounts" ADD CONSTRAINT "family_accounts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_cycles" ADD CONSTRAINT "financial_cycles_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_mutations" ADD CONSTRAINT "financial_mutations_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_account_fk" FOREIGN KEY ("family_id","account_id") REFERENCES "public"."family_accounts"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_cycle_fk" FOREIGN KEY ("family_id","cycle_id") REFERENCES "public"."financial_cycles"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_category_fk" FOREIGN KEY ("family_id","category_id") REFERENCES "public"."categories"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_budget_line_fk" FOREIGN KEY ("family_id","budget_line_id") REFERENCES "public"."budget_lines"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_occurrence_fk" FOREIGN KEY ("family_id","bill_occurrence_id") REFERENCES "public"."bill_occurrences"("family_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reversal_of_fk" FOREIGN KEY ("family_id","account_id","reversal_of_id") REFERENCES "public"."transactions"("family_id","account_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bill_occurrences_recurring_due_unique" ON "bill_occurrences" USING btree ("recurring_bill_id","due_on") WHERE "bill_occurrences"."recurring_bill_id" is not null;--> statement-breakpoint
CREATE INDEX "bill_occurrences_family_status_due_idx" ON "bill_occurrences" USING btree ("family_id","status","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_lines_family_cycle_label_unique" ON "budget_lines" USING btree ("family_id","cycle_id",lower("label"));--> statement-breakpoint
CREATE INDEX "budget_lines_family_cycle_idx" ON "budget_lines" USING btree ("family_id","cycle_id");--> statement-breakpoint
CREATE INDEX "categories_family_kind_active_idx" ON "categories" USING btree ("family_id","kind","active");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_cycles_one_active_per_family_idx" ON "financial_cycles" USING btree ("family_id") WHERE "financial_cycles"."status" = 'active';--> statement-breakpoint
CREATE INDEX "financial_cycles_family_next_payday_idx" ON "financial_cycles" USING btree ("family_id","next_payday_on");--> statement-breakpoint
CREATE INDEX "financial_mutations_family_created_idx" ON "financial_mutations" USING btree ("family_id","created_at");--> statement-breakpoint
CREATE INDEX "recurring_bills_family_active_idx" ON "recurring_bills" USING btree ("family_id","active");--> statement-breakpoint
CREATE INDEX "transactions_family_occurred_created_idx" ON "transactions" USING btree ("family_id","occurred_on","created_at");--> statement-breakpoint
CREATE INDEX "transactions_family_cycle_idx" ON "transactions" USING btree ("family_id","cycle_id");--> statement-breakpoint
CREATE INDEX "transactions_family_category_idx" ON "transactions" USING btree ("family_id","category_id");