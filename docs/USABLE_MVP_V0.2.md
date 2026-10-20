# Family Finance Usable MVP v0.2

This is a temporary, single-device validation product. The PRD, user flow,
wireframes, and technical design remain the roadmap for the future shared,
authenticated application.

## Included

- `/` and `/demo` remain public and the demo remains memory-only.
- `/app` provides financial onboarding and a local family dashboard.
- `/app/transactions` supports income and expense creation, correction, and
  user-facing deletion. Corrections append reversal records instead of erasing
  ledger history.
- `/app/plan` manages the active-cycle essential budget, protected reserve,
  payday, and dated bills. Paying a bill creates its linked expense and removes
  the unpaid obligation in the same persisted state update.
- `/app/simulate` uses the stored family snapshot without creating a
  transaction.
- `/app/backup` exports and validates a versioned JSON backup.

All money is stored as decimal strings and calculated with JavaScript `bigint`.
The local release stores one validated snapshot in IndexedDB. It does not use
LocalStorage, Auth, financial APIs, Neon, Hyperdrive, analytics, or payments.

## Run locally

```sh
pnpm --filter @family-finance/web dev:local
```

Build the no-binding local release:

```sh
pnpm --filter @family-finance/web build:local
pnpm --filter @family-finance/web exec wrangler deploy --dry-run
```

The second command is inspection-only. Do not deploy without explicit
authorization.

## Data and backup limitations

- Clearing site data, using private browsing, or losing the device can destroy
  the only live copy. Export JSON regularly and protect the file as sensitive.
- There is no multi-device or partner synchronization and no conflict handling.
- IndexedDB is not encryption. Anyone with access to the browser profile or
  backup file may read the data.
- Essential budgets are evaluated against transactions in the current payday
  cycle. The allocation carries forward until the user edits it; there is no
  per-cycle approval workflow yet.
- Bills are dated one-off occurrences. Recurring bill generation is intentionally
  deferred to the server-backed roadmap to avoid accidental duplicates.
- The opening balance cannot yet be reconciled from the UI. A future local
  iteration should add an immutable reconciliation event.

