# Progress

Work in task order. A task is complete only when implementation and local acceptance checks pass; milestone gates still need owner review.

## M0 — Foundation (weeks 1–2)

- [x] M0-01 Repository layout, workspace/tooling baseline, `AGENTS.md`, and repository specifications.
- [x] M0-02 Seven-service Compose stack, Dockerfiles, health checks, volumes, Caddy, and dev override. Production-style and dev stacks reached healthy status. The dev proxy serves `http://localhost`; MongoDB volumes were preserved. Local S3 storage uses RustFS because the roadmap's MinIO image was unavailable; see `docs/DECISIONS.md`.
- [x] M0-03 Nest API skeleton, Zod config, Mongo-backed `/api/health`, request IDs, structured logging, and standard error shape. `make check` passed.
- [x] M0-04 Next.js public/partner/admin route groups, layouts, translations, and typed API client. Production build and browser smoke checks passed.
- [x] M0-05 MongoDB replica set, first migration, and migrate/seed commands. `202611240001-foundation-metadata.js` applied previously; a repeat run found no pending migration. Seed connection succeeded; sample business data comes in later milestones.
- [x] M0-06 Shared permissions, status enums, integer-paise Money and GST helpers. Nine unit tests passed for safe ranges, arithmetic, half-up rounding, tax reconciliation, permissions, and status values. The GST rounding default is documented in `docs/QUESTIONS.md`; owner review remains open.
- [x] M0-07 GitHub Actions workflow added at `.github/workflows/ci.yml` for install, lint, typecheck, tests, build, Compose startup, API integration, and browser smoke. The equivalent local quality and Compose checks passed. GitHub-hosted Actions has not run because no Git remote is configured in this workspace.
- [x] M0-08 Supertest API integration harness, unique throwaway MongoDB test database, partner fixture factory, Playwright config, and browser smoke coverage. API integration: 1 passed. Playwright: 3 passed.

**M0 local implementation:** Complete. `make check` passed (lint, typecheck including test sources, unit tests, build, and Mongo-backed API integration). `make e2e` passed all three browser checks. Compose showed all nine development services running; site, API, Mailpit, and Mongo Express returned HTTP 200. The temporary `franchise_crm_test_*` database count was zero after integration cleanup.

**Formal M0 gate:** Await the first hosted CI result and owner review of the GST rounding default. The owner explicitly directed M1 work to begin while these M0 review items remain open; they are still release gates and must be resolved before staging.

## M1 — Identity and access (in progress)

The identity models, MongoDB migration, bootstrap roles/admin, separate admin/partner login, Redis-backed sessions, CSRF, Argon2id passwords, admin TOTP and recovery codes, permission guard, user/role management, audit writes/reads, reset-token outbox/worker, profile and password-change UI, and partner-scope helper are implemented in the workspace. MongoDB remains the system of record; Redis stores expiring session state only.

**Local checks run 2026-11-24:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed (shared 9/9; API unit checks 6 passed; the host-side Mongo integration case is intentionally skipped without `MONGODB_TEST_URI`). `make api-test` then passed 1/1 against a unique disposable MongoDB replica-set database and the Compose Redis service. This exercised admin TOTP enrollment/recovery codes, user creation and role denial, audit filtering/immutability, partner login, reset email outbox/token, password reset/change and session revocation, lockout, and health/error handling. `make migrate-dev` applied `202611240002-identity-and-audit.js` to the preserved development database. `pnpm e2e` passed all three browser smoke flows after Playwright was granted local process permission.

The dev stack was rebuilt with `docker compose ... up --build --wait --detach --renew-anon-volumes`; all nine services reached healthy status. Named MongoDB, Redis, and object-storage volumes were preserved. `http://localhost`, `/api/health`, Mailpit (`:8025`), and Mongo Express (`:8081`) returned HTTP 200. During this run, stale anonymous dependency volumes were replaced and the shared ESM package entry points were fixed to include Node-resolvable `.js` extensions. Explicit Nest injection tokens were added so the `tsx` integration harness resolves providers correctly.

**Remaining before M1 can be accepted:** finish partner 2FA controls and role-aware navigation; complete a cross-partner isolation integration proof; resolve the M0 hosted-CI and GST-rounding owner review; configure authenticated least-privilege MongoDB audit permissions before staging. The current local Mongo Compose connection is unauthenticated, so the custom `auditAppender` database role is not enforced there. Login throttling beyond account lockout and password-reset rate limiting are still outstanding security work.

The M1 integration suite now covers the main API acceptance flows. M1-08/M1-09 still need direct authenticated browser coverage, and partner 2FA controls and role-aware navigation remain incomplete. M1-10's cross-partner integration proof is outstanding; the helper unit test proves the unresolved partner scope fails closed, but does not yet demonstrate a database read isolation scenario.

## Later milestones

M2 Partners and KYC; M3 Plans and billing; M4 Wallet and ledger; M5 Catalogue and orders; M6 Service setup; M7 CRM and leads; M8 Commissions and payouts; M9 Support, reports, and content; M10 Partner tools and release. Do not begin later milestones until M1 acceptance checks pass and its live-demo gate is approved. See `docs/MILESTONES.md` for task lists and gates.
