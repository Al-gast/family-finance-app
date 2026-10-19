# Family Finance App

M0.1 infrastructure scaffold for the Family Finance product. The repository currently contains only:

- a pnpm workspace;
- a React + Vite + TypeScript single-page application;
- a Hono API running in the Cloudflare Workers runtime through Cloudflare's official Vite plugin;
- a public `GET /health` endpoint; and
- non-functional `/` and `/demo` placeholders.

Database access, authentication, financial calculations, and payments are intentionally out of scope for this milestone.

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

## Quality checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

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
```

Future shared packages may be added under `packages/` by their corresponding implementation milestones. Do not add secrets to `VITE_*` variables; those values are exposed to browser code.
