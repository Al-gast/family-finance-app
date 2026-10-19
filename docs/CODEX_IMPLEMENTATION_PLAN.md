# CODEX IMPLEMENTATION PLAN — Family Finance App

**Version:** 0.1 · Companion to `TECHNICAL_DESIGN.md`

> Work in **small pull requests / commits**, not “build entire app”. Before each task read: `AGENTS.md`, `docs/PRD.md`, `docs/USER_FLOW.md`, `docs/WIREFRAMES.md`, `docs/TECHNICAL_DESIGN.md`. Do not claim tests passed without executing them.

## Phase M0 — Infrastructure POC (first priority)

| Task | Expected change | Done when |
|---|---|---|
| M0.1 | Initialize pnpm workspace, Vite/React/TS, Hono Worker and static assets | Local build + Worker `/health` |
| M0.2 | Set up Neon dev database, Hyperdrive **caching disabled**, Drizzle migration | `SELECT 1`, migration run, no secrets committed |
| M0.3 | Connect Neon Managed Auth React sign-in to Hono `/api/v1/me` | Real signed token verified by backend; 401 on invalid token |
| M0.4 | Validate interactive SQL transaction (commit/rollback) and fresh read | Forced exception rolls back all writes; no cached stale read |
| M0.5 | Minimal Workers deployed smoke test + concurrency benchmark | Auth/DB work in deployed Workers; CPU/limits measured |

**STOP** if M0.3 or M0.4 fails. Fix architecture or document alternative before implementing money features.

## Phase M1 — Financial foundation

| Task | Expected change | Done when |
|---|---|---|
| M1.1 | Financial Drizzle schema, indexes, constraints + migration | Schema integration tests pass |
| M1.2 | Domain IDR BigInt, payment date rules, cycle calculations | Unit tests cover date/precision boundaries |
| M1.3 | Immutable ledger write & reconciliation service | Atomic commits, rollback and concurrency tests |
| M1.4 | Bills, budgets, and occurrence generation | No double count / duplicate occurrence; overdue included |
| M1.5 | `simulatePurchase` and snapshot queries | Example values and invariant tests pass |

## Phase M2 — Family and authenticated API

| Task | Expected change | Done when |
|---|---|---|
| M2.1 | Family create/membership/seat/invitations | Max 2 people, one family/user, token expiry/unique |
| M2.2 | Onboarding API and initial account balance | Paid-access guard (test entitlement), atomic setup |
| M2.3 | Dashboard/transactions/budget/bills/reconciliation API | Tenant isolation, Zod validation, idempotency |
| M2.4 | Error response/middleware/security and audit log | Cross-family tests and sensitive log review pass |

## Phase M3 — UX & product demo

| Task | Expected change | Done when |
|---|---|---|
| M3.1 | Landing & interactive anonymous demo | No login; no financial values sent to server or analytics |
| M3.2 | Login/onboarding/dashboard screens | Mobile states and route guards implemented |
| M3.3 | Simulate, transactions, budgets, bills and reconciliation screens | Working end-to-end with backend; no duplicate saves |
| M3.4 | Invite partner flow and PWA basics | 2-user app, API not cached offline |

## Phase M4 — Commercial launch

| Task | Expected change | Done when |
|---|---|---|
| M4.1 | Choose payment gateway, sandbox adapter/webhooks | Signed webhook/idempotency verified; no redirect unlock |
| M4.2 | Entitlement and payment state UI | Fail/pending/paid/refund tested |
| M4.3 | Privacy, terms, refund, support, retention & export/deletion | Product/business approval |
| M4.4 | Backup/restore practice, monitoring, rate limits, production smoke tests | Restore drill & security checks completed |

## Initial Codex prompt (M0.1 only)

```text
Read AGENTS.md and docs/TECHNICAL_DESIGN.md first, also docs/PRD.md,
docs/USER_FLOW.md and docs/WIREFRAMES.md. Implement ONLY task M0.1:
initialize a pnpm workspace with React + Vite + TypeScript and a Hono
API running on Cloudflare Workers using Cloudflare's official Vite
plugin. Add GET /health and basic root/demo placeholder routes.
No database, financial tables, mock auth credentials, payments, or custom
password service yet. Use versioned dependencies and a lockfile; document
setup commands in README. Run available typecheck, lint and build commands
and report exactly which commands actually ran and their results.
List any assumptions and changed files. Do not implement M0.2–M4.
```

## Acceptance review per Codex PR

- Diff limited to requested task; files follow repository conventions.
- Validation/error handling included and visible UX states supported.
- Security/tenancy on every private API (once API exists).
- Money mutations ACID + idempotency; no floats; no financial amounts in analytics.
- Tests were actually executed and outcomes disclosed; migrations documented.
- Documentation updated when decisions change.
