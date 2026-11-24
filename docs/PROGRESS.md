# Progress

Work in task order. A task is complete only when implementation and local acceptance checks pass; milestone gates still need owner review.

## M0 — Foundation (weeks 1–2)

- [x] M0-01 Repository layout, workspace/tooling baseline, `AGENTS.md`, and repository specifications.
- [x] M0-02 Seven-service Compose stack, Dockerfiles, health checks, volumes, Caddy, and dev override. Production-style and dev stacks reached healthy status. The dev proxy serves `http://localhost`; MongoDB volumes were preserved. Local S3 storage uses RustFS because the roadmap's MinIO image was unavailable; see `docs/DECISIONS.md`.
- [x] M0-03 Nest API skeleton, Zod config, Mongo-backed `/api/health`, request IDs, structured logging, and standard error shape. `make check` passed.
- [x] M0-04 Next.js public/partner/admin route groups, layouts, translations, and typed API client. Production build and browser smoke checks passed.
- [x] M0-05 MongoDB replica set, first migration, and migrate/seed commands. `202611240001-foundation-metadata.js` applied previously; a repeat run found no pending migration. Seed connection succeeded; sample business data comes in later milestones.
- [x] M0-06 Shared permissions, status enums, integer-paise Money and GST helpers. Nine unit tests passed for safe ranges, arithmetic, half-up rounding, tax reconciliation, permissions, and status values. The GST rounding default is documented in `docs/QUESTIONS.md`; owner review remains open.
- [x] M0-07 GitHub Actions workflow added at `.github/workflows/ci.yml` for install, lint, typecheck, tests, build, Compose startup, API integration, and browser smoke. Hosted run `45361357670` on commit `8a3d8fe` passed all workflow steps. An earlier clean-checkout run exposed missing shared-package build ordering in typecheck; `turbo.json` now builds workspace dependencies first.
- [x] M0-08 Supertest API integration harness, unique throwaway MongoDB test database, partner fixture factory, Playwright config, and browser smoke coverage. API integration: 1 passed. Playwright: 3 passed.

**M0 local implementation:** Complete. `make check` passed (lint, typecheck including test sources, unit tests, build, and Mongo-backed API integration). `make e2e` passed all three browser checks. Compose showed all nine development services running; site, API, Mailpit, and Mongo Express returned HTTP 200. The temporary `franchise_crm_test_*` database count was zero after integration cleanup.

**Formal M0 gate:** Hosted CI is green on `8a3d8fe`. Owner review of the documented GST rounding default remains open. M1 work began at the owner's direction while that review was pending; resolve it before staging.

## M1 — Identity and access (in progress)

The identity models, MongoDB migration, bootstrap roles/admin, separate admin/partner login, Redis-backed sessions, CSRF, Argon2id passwords, admin TOTP and recovery codes, permission guard, user/role management, audit writes/reads, reset-token outbox/worker, profile and password-change UI, and partner-scope helper are implemented in the workspace. MongoDB remains the system of record; Redis stores expiring session state only.

**Local checks run 2026-11-24:** `make check` passed lint, typecheck, unit tests, build, and Mongo/Redis API integration (integration 1/1; shared tests 9/9; API unit tests 6 passed and 1 host-only integration test skipped without `MONGODB_TEST_URI`). Integration coverage now exercises admin TOTP enrollment/recovery codes, partner TOTP enrollment/login/disable and session revocation, role denial, audit filtering/immutability, password reset outbox/token and rate limits, password change, account lockout, a MongoDB-backed partner-path isolation query, and health/error handling. `pnpm e2e` passed 5/5 browser flows, including role-aware navigation and partner authenticator enrollment/recovery-code display. A first sandboxed browser run could not start Chromium due to local Mach permission; the authorized local-process run passed.

`make migrate-dev` applied forward migrations `202611240003-identity-app-role.js`, `202611240004-runtime-role-discovery.js`, and `202611240005-runtime-role-discovery.js`; a repeat found no pending migrations. `mongosh` inspection confirmed `crmApplication` has CRUD/index permissions only on identity collections, `listCollections` for model discovery, and inherits audit privileges limited to find/insert/index discovery. The development MongoDB remains unauthenticated; the role is therefore defined and inspected but not enforced by this local service connection. API configuration now requires distinct authenticated runtime (`MONGODB_URI`) and migration (`MONGODB_MIGRATION_URI`) identities in production. Login and reset limits use expiring Redis counters, never Redis data storage.

GitHub Actions run `45361357670` on commit `8a3d8fe` passed from a clean hosted checkout, including install, lint, typecheck, unit tests, build, Playwright setup, Compose startup, migration, seed, API integration, and browser smoke.

The dev stack was rebuilt with `make up-dev`; all nine services reached healthy status and the named MongoDB, Redis, and object-storage volumes were preserved. The public site (`http://localhost`), API health (`http://localhost/api/health`), Mailpit (`http://localhost:8025`), and Mongo Express (`http://localhost:8081`) returned HTTP 200.

**M1 implementation acceptance:** partner 2FA controls, role-aware navigation, a database-backed scope-isolation proof, login/reset throttling, and least-privilege Mongo runtime roles are implemented and passed local checks. M1 remains open pending the staged security/deployment gate: provision separate authenticated migration/runtime Mongo identities and demonstrate that the runtime role enforces the grants, review the staging live demo, and close the M0 GST-rounding owner review. Hosted CI run `45372003559` passed on commit `15a6987`, including Compose, migrations, seed, API integration, and browser flows.

**M1 gate review, 2026-11-24:** reviewed the local implementation, migration grants, hosted CI, and roadmap gate. Decision: not passed. The workspace has no staging deployment target or authenticated staging database access; local Mongo is unauthenticated, so runtime denial of audit updates/deletes has not been demonstrated. The M0 GST rounding owner review and live staging demo approval are also pending. See [M1_GATE_REVIEW.md](M1_GATE_REVIEW.md). No M2 work has started.

M1-08/M1-09 browser coverage includes mocked authenticated role-aware navigation and partner 2FA enrollment UI; admin editing/audit remain API-integrated with the existing admin pages. The direct end-to-end login experience and staging checks are part of the remaining gate. M1-10's database-backed scope test proves records outside the actor's configured partner path are excluded; M2 must still provide a resolved hierarchy path before the helper can enforce a real partner tree.

## Later milestones

M2 Partners and KYC; M3 Plans and billing; M4 Wallet and ledger; M5 Catalogue and orders; M6 Service setup; M7 CRM and leads; M8 Commissions and payouts; M9 Support, reports, and content; M10 Partner tools and release. Do not begin later milestones until M1 acceptance checks pass and its live-demo gate is approved. See `docs/MILESTONES.md` for task lists and gates.
