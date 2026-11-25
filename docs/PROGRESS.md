# Progress

Work in task order. M1 was accepted by the owner on local evidence; live staging checks are deferred until release preparation.

## M0 — Foundation (weeks 1–2)

- [x] M0-01 Repository layout, workspace/tooling baseline, `AGENTS.md`, and repository specifications.
- [x] M0-02 Seven-service Compose stack, Dockerfiles, health checks, volumes, Caddy, and dev override. Production-style and dev stacks reached healthy status. The dev proxy serves `http://localhost`; MongoDB volumes were preserved. Local S3 storage uses RustFS because the roadmap's MinIO image was unavailable; see `docs/DECISIONS.md`.
- [x] M0-03 Nest API skeleton, Zod config, Mongo-backed `/api/health`, request IDs, structured logging, and standard error shape. `make check` passed.
- [x] M0-04 Next.js public/partner/admin route groups, layouts, translations, and typed API client. Production build and browser smoke checks passed.
- [x] M0-05 MongoDB replica set, first migration, and migrate/seed commands. `202611240001-foundation-metadata.js` applied previously; a repeat run found no pending migration. Seed connection succeeded; sample business data comes in later milestones.
- [x] M0-06 Shared permissions, status enums, integer-paise Money and GST helpers. Nine unit tests passed for safe ranges, arithmetic, half-up rounding, tax reconciliation, permissions, and status values. Owner-approved convention: half-up per line; odd paisa to SGST intra-state.
- [x] M0-07 GitHub Actions workflow added at `.github/workflows/ci.yml` for install, lint, typecheck, tests, build, Compose startup, API integration, and browser smoke. Hosted run `45361357670` on commit `8a3d8fe` passed all workflow steps. An earlier clean-checkout run exposed missing shared-package build ordering in typecheck; `turbo.json` now builds workspace dependencies first.
- [x] M0-08 Supertest API integration harness, unique throwaway MongoDB test database, partner fixture factory, Playwright config, and browser smoke coverage. API integration: 1 passed. Playwright: 3 passed.

**M0 local implementation:** Complete. `make check` passed (lint, typecheck including test sources, unit tests, build, and Mongo-backed API integration). `make e2e` passed all three browser checks. Compose showed all nine development services running; site, API, Mailpit, and Mongo Express returned HTTP 200. The temporary `crm_test_*` database count was zero after integration cleanup.

**Formal M0 gate:** Hosted CI is green on `8a3d8fe`; the GST convention is approved by owner.

## M1 — Identity and access (owner accepted locally)

The identity models, MongoDB migration, bootstrap roles/admin, separate admin/partner login, Redis-backed sessions, CSRF, Argon2id passwords, admin TOTP and recovery codes, permission guard, user/role management, audit writes/reads, reset-token outbox/worker, profile and password-change UI, and partner-scope helper are implemented in the workspace. MongoDB remains the system of record; Redis stores expiring session state only.

**Local checks run 2026-11-24:** `make check` passed lint, typecheck, unit tests, build, and Mongo/Redis API integration (integration 1/1; shared tests 9/9; API unit tests 6 passed and 1 host-only integration test skipped without `MONGODB_TEST_URI`). Integration coverage now exercises admin TOTP enrollment/recovery codes, partner TOTP enrollment/login/disable and session revocation, role denial, audit filtering/immutability, password reset outbox/token and rate limits, password change, account lockout, a MongoDB-backed partner-path isolation query, and health/error handling. `pnpm e2e` passed 5/5 browser flows, including role-aware navigation and partner authenticator enrollment/recovery-code display. A first sandboxed browser run could not start Chromium due to local Mach permission; the authorized local-process run passed.

The local development stack now uses authenticated `crm_app` and `crm_migrator`, stores audit/ledger/order events in `crm_immutable`, and retains `franchise_crm` as the source copy. Migration 202611240006 copied local identity/audit data without deleting the source database. The local authorization probe passed: runtime find/insert succeeded; update/delete were denied.

Migrations do not create/update MongoDB roles. The forward database migration copies legacy documents using idempotent upserts without deleting the original database or named volumes. `make up-dev` rebuilt the API/worker/web/migrator images, applied migrations 001–006, and reported all dev services healthy. A repeat `make migrate-dev` exited 0 with no migrations pending. `make check` passed lint, typecheck, unit tests, build, integration (1/1), and the local authorization probe. `make e2e` passed 5/5. Compose inspection showed API/worker have `MONGODB_URI` only, migrator has `MONGODB_MIGRATE_URI` only; staging Compose contains no `db` service. Host checks returned HTTP 200 for the site, API health, Mailpit, and read-only Mongo Express. Live Atlas probes/demo remain deferred by owner.

GitHub Actions run `45361357670` on commit `8a3d8fe` passed from a clean hosted checkout, including install, lint, typecheck, unit tests, build, Playwright setup, Compose startup, migration, seed, API integration, and browser smoke.

The dev stack was rebuilt with `make up-dev`; all nine services reached healthy status and the named MongoDB, Redis, and object-storage volumes were preserved. The public site (`http://localhost`), API health (`http://localhost/api/health`), Mailpit (`http://localhost:8025`), and Mongo Express (`http://localhost:8081`) returned HTTP 200.

**M1 implementation acceptance:** partner 2FA controls, role-aware navigation, a database-backed scope-isolation proof, login/reset throttling, and least-privilege Mongo runtime roles passed prior local checks. M1 is accepted by owner. Hosted CI run `45372003559` passed on commit `15a6987`, including Compose, migrations, seed, API integration, and browser flows.

**M1 gate review, 2026-11-24:** accepted by owner on local evidence. Live staging checks are deferred by owner until release preparation. See [M1_GATE_REVIEW.md](M1_GATE_REVIEW.md) and the release checklist at the top of `AGENTS.md`.

M1-08/M1-09 browser coverage includes mocked authenticated role-aware navigation and partner 2FA enrollment UI; admin editing/audit remain API-integrated with the existing admin pages. M1-10's database-backed scope test proves records outside the actor's configured partner path are excluded; M2 provides the hierarchy path used for real downline scoping.

## M2 — Partners and KYC (in progress)

Implemented so far: MongoDB models and migrations 202611240007/008 for territories, applications, partners, partner-user links, KYC metadata, and exclusive territory reservation. Migration 007 seeded the two local demo territories; migration 008 was applied locally on 2026-11-25 with `make migrate-dev`. Public APIs provide territory listing/availability, rate-limited application submission, CSRF protection, email verification through the Mongo outbox, and audit events. The admin API provides a filtered queue, detail metadata, eligible parent listing, approve/reject/request-info actions, transactional partner/user/path creation, parent-tier checks, KYC ownership transfer, invite outbox, and exclusive territory reservation. `/apply` and `/apply/verify` are implemented. `/admin/applications` now provides the reviewer queue, details, document metadata, and role-aware decision controls, including a parent partner picker.

**Local checks, 2026-11-25:** `make check` passed lint, typecheck, unit tests, web/API build, Mongo integration (1/1), and Mongo authorization probe. Unit suites reported shared 9/9 and API 9 passed with one test intentionally skipped when the suite runs without a test URI; database-backed integration ran separately and passed 1/1. It exercises master approval, rejects distributor approval without a parent, verifies valid parent assignment/materialized path, and verifies a partner-scoped Mongo query includes self/downline and excludes other partners. That integration test exposed a partner-code collision when codes used leading ObjectId characters; codes now use trailing ObjectId bytes. `make e2e` passed 6/6 against the local site. Migration 008 applied successfully. `make up-dev` completed; site, API health, Mailpit, and Mongo Express returned HTTP 200; all nine dev Compose services were healthy. Existing Mongo/Redis/storage volumes were preserved. `.dockerignore` now excludes Turbo and Playwright artifacts to avoid sending multi-gigabyte build context on future container rebuilds.

**Still required before M2 acceptance:** presigned private KYC upload and authenticated document viewing; invite-driven lower-tier applications with seat quota; partner profile/KYC document management and expiry reminders; admin partner list/detail/tree, suspend/reactivate, and 2FA reset; PAN/bank field encryption and masking tests; partner network page; tests proving suspended partners cannot transact/request top-ups; and full acceptance E2E through partner creation and pending-payment onboarding. The request guard now resolves partner membership and allowed subtree IDs from the materialized path; the integration test verifies DB-backed self/downline inclusion. No later milestone has started.

Live Atlas checks are deferred by owner and remain a pre-release checklist before M10. See `docs/MILESTONES.md` and `docs/M1_GATE_REVIEW.md`.
