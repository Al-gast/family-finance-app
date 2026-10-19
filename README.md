# Family Finance App

Infrastructure proof of concept for the Family Finance product. The repository currently contains:

- a pnpm workspace;
- a React + Vite + TypeScript single-page application;
- a Hono API running in the Cloudflare Workers runtime through Cloudflare's official Vite plugin;
- a public `GET /health` endpoint; and
- non-functional `/` and `/demo` placeholders;
- a reusable `pg` + Drizzle database module; and
- a `DB_FRESH` Cloudflare Hyperdrive binding intended for a Neon development database.

Authentication, financial tables and calculations, and payments are intentionally out of scope. The public health endpoint does not query the database.

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

- `/` — application placeholder
- `/demo` — public demo placeholder; no financial functionality or persistence
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

5. Apply the infrastructure-only baseline migration and run the private database checks:

   ```sh
   pnpm db:migrate
   pnpm db:check
   ```

   `db:check` performs `SELECT 1` and verifies rollback using a session-scoped temporary table. It exposes no HTTP diagnostic route and leaves no application fixture table behind.

Local Wrangler development connects directly to the URL override, so it verifies Worker/driver compatibility but does not exercise Cloudflare's remote connection pool or cache setting. Verify the real Hyperdrive configuration with a carefully controlled remote/deployed smoke test before declaring M0.2 complete.

The Worker compatibility date is pinned to `2026-10-12`, the newest date accepted by the currently locked local `workerd` runtime. Update it only alongside the Cloudflare toolchain and rerun the local Worker smoke test.

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
├── src/react-app/   # React placeholder UI
├── src/worker/      # Hono Worker and health endpoint
├── vite.config.ts
└── wrangler.jsonc
packages/db/
├── src/              # Reusable pg + Drizzle connection module
├── drizzle/          # Versioned infrastructure migrations
└── test/             # Explicit PostgreSQL integration checks
```

Future shared packages may be added under `packages/` by their corresponding implementation milestones. Do not add secrets to `VITE_*` variables; those values are exposed to browser code.
