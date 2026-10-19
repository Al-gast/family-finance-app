# Codex Engineering Instructions — Family Finance App

## Role
Act as a careful senior full-stack engineer working on a family financial planning product. Optimize for correctness, security, maintainability, simplicity and testability, not speed or code volume.

## Source of truth
Read `docs/PRD.md`, `docs/USER_FLOW.md`, `docs/WIREFRAMES.md`, `docs/TECHNICAL_DESIGN.md`, and `docs/CODEX_IMPLEMENTATION_PLAN.md` before writing code. Call out conflicts and assumptions; do not silently redefine product requirements.

## Stack
React, Vite, TypeScript, Hono on Cloudflare Workers, Neon PostgreSQL, Cloudflare Hyperdrive (SQL response caching disabled), Drizzle ORM, managed Neon Auth (subject to M0 POC), Zod, Vitest. No microservices or premature abstractions.

## Development workflow
1. Only implement the single requested task / phase.
2. Briefly inspect existing code and conventions first.
3. Write a minimal plan; describe architecture-changing assumptions.
4. Add/modify code with tests that cover the acceptance criteria.
5. Run typecheck, lint, tests, and build when available; never fabricate test results.
6. Report changed files, checks actually run, and known limitations.
7. Do not add unrelated dependencies, features, pages, or boilerplate.

## Financial rules — non-negotiable
- Use integer IDR, PostgreSQL BIGINT, JS bigint for calculations, decimal strings at JSON boundary. Never JS float for monetary calculations.
- Keep calculations in a pure shared domain module and preserve negative available-to-spend values.
- Never use the Neon HTTP Drizzle driver for interactive money transactions.
- Use short DB transactions for ledger, bill settlement, reconciliation, correction, family invitation and payment entitlement changes.
- User-facing edits/deletes must preserve immutable ledger history through reversals.
- All mutating financial requests require persisted idempotency (unique constraint), not in-memory-only dedupe.
- A paid bill decreases cash balance AND unpaid obligations once; an essential expense decreases cash AND remaining essential budget once. Never double count.
- Simulation is read-only and never creates a financial transaction automatically.
- Treat future income as unavailable until recorded received. Show stale financial input warning.

## Security — non-negotiable
- Never expose DB/password/payment secrets to client code or Git.
- Verify authentication on server via documented provider mechanism; never trust unverified JWT payloads or browser role flags.
- Scope every private query/update by verified family membership; users cannot access another family's data even by guessing IDs.
- DB Hyperdrive must disable query response caching for user finance, auth/tenant, payment/entitlement reads; authenticated API responses no-store.
- No sensitive financial values in Meta Pixel, analytics or logs. Public demo runs locally and stores no entered amounts.
- Validate provider payment webhook signatures and idempotency before activating entitlements; browser redirects never unlock access.
- Don't store financial API responses in PWA offline caches or LocalStorage.

## Architecture and scope gates
- **M0 first:** verify Worker/Hyperdrive/Postgres interactive transactions and Neon Auth → Hono authentication in real runtime before financial implementation.
- If an upstream API/platform limitation appears, provide evidence, alternatives and trade-offs rather than silently swapping technologies.
- Delay paid production launch unless payment reconciliation, backup/restore, privacy and security checks are met.
