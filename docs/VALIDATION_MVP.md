# Rapid Market Validation MVP

## Purpose and duration

This is a temporary 1–3 day validation scope for testing whether Indonesian
families are interested in a clearer answer to “is this purchase safe?” The
existing PRD, user flows, wireframes, technical design, and implementation plan
remain the source of truth for the future full product. This document narrows
only the public prototype used for initial market validation; it does not
replace those documents.

## Included

- A mobile-first Indonesian landing page at `/`.
- A public, login-free “Boleh Checkout?” calculator at `/demo`.
- An optional external early-access interest link configured with
  `VITE_EARLY_ACCESS_URL`.
- A planned early-access price of Rp149.000, clearly presented as unavailable
  for purchase in this prototype.
- Pure, locally executed calculations using the values entered by the visitor.
- Four payload-free browser funnel events: `landing_view`, `demo_start`,
  `demo_complete`, and `early_access_click`.

The estimate is:

```text
availableToSpend = balance - unpaidBills - remainingEssentials - protectedReserve
remainingAfterPurchase = availableToSpend - purchasePrice
```

All amount inputs must be nonnegative safe integers in IDR. Negative calculated
results are preserved and displayed as deficits. Future income is deliberately
excluded until it has actually been received.

## Privacy and trust boundaries

- Financial inputs stay in transient browser memory and are not sent to an API,
  database, authentication provider, analytics tool, or browser storage.
- The calculator requires no login.
- No Meta Pixel or other analytics instrumentation receives financial values.
- Funnel events contain only their event name. The application does not attach
  amounts, product names, user identifiers, or URL data.
- If `VITE_EARLY_ACCESS_URL` is absent or invalid, the UI says “Segera hadir”
  and does not imitate a successful registration.
- There is no purchase flow and no payment is accepted.

## Explicitly excluded

- Payments, subscriptions, and entitlements.
- Family membership and invitations.
- Financial accounts, ledgers, transactions, bills, or reconciliation.
- Persisting calculator input or results.
- Applying the pending M1.1 database migrations.
- A bundled analytics provider, consent manager, or production pixel.

Existing `/auth`, `/health`, `/api/v1/me`, Neon, Hyperdrive, and pending schema
work remain preserved, but they are not extended by this validation scope.

## Validation signals and integration contract

The browser dispatches these native `window` events without a detail payload:

- `landing_view` once when the landing page is shown;
- `demo_start` once after the visitor first interacts with the calculator;
- `demo_complete` once after the first valid calculation; and
- `early_access_click` when the configured external CTA is selected.

An approved analytics adapter may listen for those exact names after any
required consent. It must forward only the name. Calculator amounts and product
names must never be added to event properties, URLs, logs, or analytics.

Before launch, configure and verify the external early-access destination,
connect and test the approved analytics destination, publish an appropriate
privacy notice, and complete real-device checks.

See `docs/CLOUDFLARE_DEPLOYMENT.md` for the deployment runbook. Deployment is a
separate, explicitly authorized operation.
