# Family Finance App

Infrastructure proof of concept for the Family Finance product. The repository currently contains:

- a pnpm workspace;
- a React + Vite + TypeScript single-page application;
- a Hono API running in the Cloudflare Workers runtime through Cloudflare's official Vite plugin;
- a public `GET /health` endpoint;
- a mobile-first validation landing page and local-only purchase simulator;
- a reusable `pg` + Drizzle database module; and
- a `DB_FRESH` Cloudflare Hyperdrive binding intended for a Neon development database; and
- Neon Managed Auth registration, login, logout, session handling, and a
  backend-verified `GET /api/v1/me` identity endpoint.

Persisted financial features, financial APIs, and payments remain out of scope.
The validation calculator is a pure browser-side estimate and never transmits
entered values. The public health endpoint does not query the database or
authentication provider.

## Prerequisites

- Node.js 20.19 or newer
- pnpm 9.4.0 (the version declared in `package.json`)

## Setup

From the repository root:

```sh
pnpm install
pnpm dev
```

The development server prints its local URL (normally `http://localhost:5173`). Useful routes:

- `/` — Indonesian market-validation landing page
- `/demo` — public “Boleh Checkout?” estimate; no login or persistence
- `/auth` — Neon Managed Auth registration/login/session screen
- `/health` — Worker health check, returning `{"status":"ok"}`

The Cloudflare Vite plugin runs the API in the Workers runtime during local development. No Cloudflare account or application secrets are required for M0.1.

When the local Hyperdrive override is absent, `pnpm dev` deliberately omits the database binding so the M0.1 placeholders and `/health` remain usable. Database-backed development requires loading `.dev.vars` first.

## M0.2 database setup

M0.2 requires a separate Neon development database and a real Cloudflare Hyperdrive configuration. Do not use production or customer data.

1. Copy the ignored local environment template:

   ```sh
   cp apps/web/.dev.vars.example apps/web/.dev.vars
   ```

2. Edit `apps/web/.dev.vars` and set both variables to the same Neon development connection URL. Keep `sslmode=require` unless the provider explicitly requires another secure mode.

   - `DATABASE_URL` is used only by developer migration and integration-test commands.
   - `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB_FRESH` is Wrangler's documented local override for the `DB_FRESH` binding.

3. Load the ignored file into the shell before starting the local Worker:

   ```sh
   set -a
   source apps/web/.dev.vars
   set +a
   pnpm dev
   ```

4. Create the Cloudflare Hyperdrive configuration with query caching disabled. Passing the shell variable avoids putting the literal URL in repository files or shell history:

   ```sh
   pnpm --filter @family-finance/web exec wrangler hyperdrive create family-finance-dev-fresh \
     --connection-string="$DATABASE_URL" \
     --caching-disabled
   ```

   `apps/web/wrangler.jsonc` is currently bound to the non-secret M0.2 Hyperdrive ID. If a different development configuration is created later, replace that ID and disable its cache explicitly:

   ```sh
   pnpm --filter @family-finance/web exec wrangler hyperdrive update <HYPERDRIVE_ID> \
     --caching-disabled
   pnpm --filter @family-finance/web exec wrangler hyperdrive get <HYPERDRIVE_ID>
   ```

   The ID is binding metadata, not a database password. Never commit a database connection URL. Cloudflare stores the remote URL in the Hyperdrive resource.

5. Run the private database checks:

   ```sh
   pnpm db:check
   ```

   `db:check` performs `SELECT 1`, verifies rollback using a session-scoped temporary table, and validates the M1.1 migration in a random schema inside a transaction that is always rolled back. It exposes no HTTP diagnostic route and leaves no application fixture table or schema behind.

Local Wrangler development connects directly to the URL override, so it verifies Worker/driver compatibility but does not exercise Cloudflare's remote connection pool or cache setting. Verify the real Hyperdrive configuration with a carefully controlled remote/deployed smoke test before declaring M0.2 complete.

The Worker compatibility date is pinned to `2026-10-12`, the newest date accepted by the currently locked local `workerd` runtime. Update it only alongside the Cloudflare toolchain and rerun the local Worker smoke test.

## M0.4 interactive transaction verification

Run the M0.4-only PostgreSQL check with the ignored development connection
configured in `apps/web/.dev.vars`:

```sh
pnpm db:verify:m0.4
```

This command deliberately selects only the infrastructure transaction test; it
does not load or apply the M1.1 migration files. It creates a uniquely named
fixture table, commits an insert and update, reads the committed values from the
original and a newly opened `pg` connection, forces a transaction rollback,
and confirms the rolled-back value is absent. Cleanup runs in `finally`, and a
last query confirms that the fixture table was dropped.

The local command connects directly to the configured Neon development URL. To
verify Hyperdrive itself, run the same helper from a short-lived, access-gated
Worker bound to `DB_FRESH`, confirm the Hyperdrive resource reports
`caching.disabled: true`, and delete that Worker immediately after the check.
Do not add a permanent database diagnostic route to the application.

## M0.3 Neon Managed Auth setup

M0.3 uses Managed Auth on the existing Neon project and branch. It does not
create application-owned password tables. Enable Managed Auth in Neon first,
then copy the exact Auth Base URL and JWT verification values shown for that
branch.

1. Create ignored local configuration files:

   ```sh
   cp apps/web/.env.example apps/web/.env.local
   cp apps/web/.dev.vars.example apps/web/.dev.vars
   ```

   If `.dev.vars` already contains the M0.2 database values, keep it and add
   only the auth variables from the example.

2. Set `VITE_NEON_AUTH_URL` in `.env.local` to the branch's Auth Base URL. This
   value is intentionally browser-visible and must not contain a password or
   private credential.

3. Set `NEON_AUTH_JWKS_URL` and `NEON_AUTH_ISSUER` in `.dev.vars` to the exact
   values for tokens issued by that Managed Auth branch. Set
   `NEON_AUTH_AUDIENCE` only if a real issued token contains an `aud` claim and
   use the applicable API audience. The Worker requires HTTPS URLs and accepts
   only EdDSA-signed tokens.

4. Start the local application as described in M0.2, open `/auth`, register or
   log in, and confirm the screen reports a server-verified session. The browser
   gets the short-lived JWT through the Neon SDK and sends it as a Bearer token;
   the Worker derives the user ID only from the verified `sub` claim.

For a deployed Worker, configure the three Worker values through Cloudflare
environment configuration or `wrangler secret put`; do not commit project-specific
values. Configure `VITE_NEON_AUTH_URL` in the build environment. `/api/v1/me`
returns `401` for missing, malformed, expired, or otherwise invalid tokens and
sets `Cache-Control: no-store` for authenticated API responses.

The secret-free unit tests use a temporary in-memory Ed25519 key pair. They do
not create users in external infrastructure by default. Repeat the controlled
live verification with ignored local configuration and a disposable test user
when the Auth branch, trusted origin, SDK, or Worker verification settings
change.

## Validation MVP v0.1

The temporary rapid-validation scope is documented in
`docs/VALIDATION_MVP.md`. Configure the optional public early-access destination
with `VITE_EARLY_ACCESS_URL`; when absent or invalid, the landing page honestly
shows “Segera hadir”. The browser emits four payload-free funnel events for an
approved analytics adapter: `landing_view`, `demo_start`, `demo_complete`, and
`early_access_click`.

Cloudflare preparation and deployment steps are in
`docs/CLOUDFLARE_DEPLOYMENT.md`. Deployment requires explicit authorization and
must not run the pending database migrations.

To build the minimal public release without Auth, private APIs, Hyperdrive, or
database connectivity:

```sh
pnpm --filter @family-finance/web build:validation
pnpm --filter @family-finance/web exec wrangler deploy --dry-run
```

This build keeps `/`, `/demo`, and `/health`; private and unfinished routes
return `404`. It always uses the honest unconfigured early-access state.

## M1.1 financial schema

The versioned M1.1 migrations are `packages/db/drizzle/0001_m1_financial_schema.sql` and `packages/db/drizzle/0002_m1_cycle_non_overlap.sql`. The second is a Drizzle custom migration because PostgreSQL exclusion constraints are not represented by Drizzle's table API. Application startup and tests never apply these files to the application schema automatically. Review the SQL and select the intended environment explicitly before running the controlled migration command:

```sh
pnpm db:migrate
```

Do not run that command against production or shared customer data as part of ordinary development or test startup.

## Quality checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The normal `pnpm test` command runs secret-free unit tests. `pnpm db:check` is deliberately separate because it requires external PostgreSQL credentials and fails when they are absent.

To inspect the production build locally after `pnpm build`:

```sh
pnpm --filter @family-finance/web preview
```

## Workspace layout

```text
apps/web/
├── src/react-app/   # React validation UI, calculator, auth proof of concept
├── src/worker/      # Hono Worker and health endpoint
├── vite.config.ts
└── wrangler.jsonc
packages/db/
├── src/              # Reusable pg + Drizzle connection module
├── drizzle/          # Versioned infrastructure migrations
└── test/             # Explicit PostgreSQL integration checks
```

Future shared packages may be added under `packages/` by their corresponding implementation milestones. Do not add secrets to `VITE_*` variables; those values are exposed to browser code.
