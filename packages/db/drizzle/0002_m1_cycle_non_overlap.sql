CREATE EXTENSION IF NOT EXISTS "btree_gist";--> statement-breakpoint
ALTER TABLE "financial_cycles"
ADD CONSTRAINT "financial_cycles_family_period_exclusion"
EXCLUDE USING gist (
	"family_id" WITH =,
	daterange("starts_on", "next_payday_on", '[)') WITH &&
);
