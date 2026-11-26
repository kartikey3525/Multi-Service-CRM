# Project status

The project is a working foundation plus a substantial frontend demonstration. It is not yet a complete CRM release.

## What exists

- The Next.js demo includes public application and sign-in flows, admin operations screens, and partner dashboard, orders, wallet, customers, leads, commissions, tickets, learning, profile and tools screens. Demo data is seeded and mutations use the local mock adapter. Several SPEC routes are absent or use aliases; see `ROADMAP.md`.
- The NestJS API has real identity/session/permissions/audit behavior, partner application and KYC workflows, partner management and scoped hierarchy reads, plus billing models and invoice-numbering code. The M3-01 Mongo concurrency and isolation acceptance tests have not run in this environment. Wallet/ledger, catalogue/orders, customers/leads, commission, support/reporting/content and partner tools are not yet real backend features; screens in those areas remain demo-driven.
- MongoDB/Mongoose is the system of record. Redis supports sessions and queues. Local object storage is RustFS. The API uses controller/service/repository layers; the repository scope guard protects partner-owned model queries.

## Repository map

```text
apps/web/       Next.js public, partner and admin demo UI
apps/api/       NestJS API, migrations, workers and tests
packages/       shared schemas, permissions, money and config
docs/           specification, architecture, decisions and plans
ops/            Compose, proxy and local infrastructure configuration
```

## Verification

- Latest recorded `make check` (2026-11-26): lint, typecheck, unit tests and web/API builds passed. API unit tests: 17 passed, 2 Mongo-only skipped. Docker denied access at `make api-test`, so Mongo integration and the authorization probe did not run.
- Playwright, local server reachability, responsive checks and accessibility checks: **unverified** for the current branch state. Historical aggregate results are documented, but route membership/output is incomplete.
- The migration for M3-01 has not been applied in this recorded run. Staging identity/probe/demo and Atlas IP restrictions are deferred before release.

## Top risks

1. Mongo-backed invoice concurrency and cross-partner integration acceptance remains unverified.
2. Wallet/ledger money movement is not implemented; it needs transaction and owner line review.
3. The demo route gaps and browser evidence need an explicit route-by-route pass.
4. Several APIs/screens are mock-only, so the demo is not evidence of production behavior.
5. Staging authorization, restore, UAT and release checks remain outstanding.
