# Cloudflare Deployment Runbook — Validation MVP v0.1

This runbook prepares a controlled Cloudflare Workers deployment. It does not
authorize deployment. Do not apply database migrations as part of this flow.

## Validation-only release

The public Validation MVP uses a separate build target that preserves the
normal M0/M1 development application while excluding it from the deployable
artifact. It contains only `/`, `/demo`, and `/health`. `/auth`, `/auth/*`, and
`/api/*` return `404` with `Cache-Control: no-store`. The validation Worker has
no Hyperdrive binding, `nodejs_compat` flag, database module, or authentication
configuration.

Build and inspect this artifact from the repository root:

```sh
pnpm --filter @family-finance/web build:validation
pnpm --filter @family-finance/web exec wrangler deploy --dry-run
```

`build:validation` deliberately compiles both `VITE_EARLY_ACCESS_URL` and
`VITE_NEON_AUTH_URL` as empty strings. The release therefore shows the honest
“Segera hadir” state and cannot inherit ignored local authentication settings.

After explicit authorization, deploy the already-built validation artifact:

```sh
pnpm --filter @family-finance/web exec wrangler deploy
```

Do not run the normal `pnpm build` between the validation build and deployment;
that would replace the generated deployment pointer with the normal M0/M1
artifact.

After deployment, verify `/`, `/demo`, and `/health` return `200`; verify
`/auth`, `/auth/*`, and `/api/*` return `404`; confirm the landing page displays
“Segera hadir”; and exercise one calculator result without observing any
financial values in network requests. Record the deployed Worker version and
the Git revision used to build it.

## Future full-application deployment reference

The remaining sections are retained for the future M0/M1 application. They are
not part of the validation-only release and their Auth, Hyperdrive, or secret
configuration steps must not be run for this release.

## 1. Preflight

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @family-finance/web exec wrangler whoami
```

Confirm that Wrangler reports the intended Cloudflare account. Review the
existing Worker name and `DB_FRESH` binding in `apps/web/wrangler.jsonc`, then
verify that Hyperdrive query caching is still disabled:

```sh
pnpm --filter @family-finance/web exec wrangler hyperdrive get 81878ca8fecb49f1a15a5ea3833c94ab
```

## 2. Configure public build values

`VITE_*` values are compiled into browser assets and are public. They must
never contain passwords, tokens, database URLs, private webhook URLs, or other
credentials.

Set the HTTPS early-access destination only for the build process:

```sh
VITE_EARLY_ACCESS_URL="https://example.com/your-waitlist" pnpm build
```

If it is omitted or invalid, the app intentionally displays “Segera hadir”.
Open the configured destination and verify ownership, HTTPS, copy, privacy
disclosure, and its success state before launch.

The app emits payload-free native browser events named `landing_view`,
`demo_start`, `demo_complete`, and `early_access_click`. Connect an approved
analytics adapter only after any required consent and forward only the event
name. Do not forward calculator values, product names, user IDs, or page URLs.

## 3. Configure Worker runtime values

Keep Neon Auth verification configuration in Cloudflare runtime secrets or an
equivalent protected environment. Do not place it in `VITE_*` variables or
commit it. Existing local `.dev.vars` and `.env.local` files are ignored.

If the deployment is expected to retain the existing auth proof of concept,
confirm these existing runtime values are configured for the intended Worker:

```sh
pnpm --filter @family-finance/web exec wrangler secret put NEON_AUTH_JWKS_URL
pnpm --filter @family-finance/web exec wrangler secret put NEON_AUTH_ISSUER
pnpm --filter @family-finance/web exec wrangler secret put NEON_AUTH_AUDIENCE
```

Only set `NEON_AUTH_AUDIENCE` when the issued token uses the corresponding
audience. These commands are configuration changes and require separate
authorization in the target account.

## 4. Inspect without deploying

The Cloudflare Vite plugin writes the deployable Worker configuration during
`vite build`. Wrangler automatically locates that generated output. Inspect a
dry-run bundle in a temporary directory:

```sh
deploy_dir="$(mktemp -d)"
pnpm --filter @family-finance/web exec wrangler deploy --dry-run --outdir "$deploy_dir"
```

Inspect `apps/web/dist/client` and the dry-run output. Verify that browser
assets contain no database URL, password, JWT, private key, or Worker-only auth
configuration. The plugin may copy `.dev.vars` into Worker build output for
local preview; Cloudflare documents that file as preview-only and not deployed.
Never upload the build directory through a separate static-hosting workflow.

## 5. Deploy only after explicit approval

After product, privacy, target-account, secret, Hyperdrive, CTA, and artifact
checks are complete, request explicit deployment authorization. Only then run:

```sh
pnpm --filter @family-finance/web exec wrangler deploy
```

Do not add `--env` after building with the Cloudflare Vite plugin. If Cloudflare
environments are introduced later, select the environment at build time with
`CLOUDFLARE_ENV` and review the generated configuration before deployment.

## 6. Post-deployment smoke checks

- `/`, `/demo`, and `/auth` return the application over HTTPS.
- `/health` returns HTTP 200 with the expected public response.
- unauthenticated `/api/v1/me` returns HTTP 401.
- the calculator works at 320px width and does not make a network request.
- each funnel step emits only its approved event name once where specified.
- the early-access CTA opens the exact configured HTTPS destination, or shows
  “Segera hadir” when no destination is configured.
- no migration command has been run.

Rollback by deploying the previously approved Worker version from Cloudflare's
version history. Record the deployed version, commit, build configuration, and
smoke-test evidence.
