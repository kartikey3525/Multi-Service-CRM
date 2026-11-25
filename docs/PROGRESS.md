# Progress

Work in task order. M1 was accepted by the owner on local evidence; live staging checks are deferred until release preparation.

## Deferred M2 (until the frontend demo is accepted)

- [ ] Invite-driven lower-tier applications with enforced seat quotas.
- [ ] KYC expiry reminders through the worker.
- [ ] Partner 2FA reset controls.
- [ ] Browser acceptance flow from email verification through reviewer approval, invite/password setup, and pending-payment login.

These M2 items are intentionally paused while the frontend demo is built. Do not begin later backend milestones during this demo work.

## Frontend demo

- Branch: `frontend-demo`, created from M2 commit `f1aff40`.
- Step 1 foundation gap repair is complete: shared Mongo record Zod schemas/types, typed domain client, mock-default/HTTP transport selection, persisted realistic fixtures, reset control, permission/subtree enforcement, lifecycle and ledger rules, GST line rounding, and mock adapter unit tests. The complete clickable admin/partner screen inventory and business flow remain to be built.
- Step 2 public/auth gaps (tokenized application and order status, forced password change, per-role sign-in shortcuts) are being closed before moving to admin.
- Foundation checks on 2026-11-25: `make check` passed lint, typecheck, all unit tests, build, Mongo integration (1/1), and the authorization probe. The Step 2 browser and responsive checks will be recorded after those screens are committed.
- Main 1280 px screenshots are committed in `docs/screenshots/`. The step-by-step screen checklist is in `docs/FRONTEND_PLAN.md`.
- Local mock-only site is running at `http://localhost:3000` via `pnpm --filter @franchise-crm/web dev`; no database or Redis is required for the demo. The repository has no root `make dev` target, so this documented command currently starts the site.
- Step 2 remains active; the demo branch is not merged to `main`.

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

Implemented so far: MongoDB migrations 202611240007–009 and models for territories, applications, partners, partner-user links, KYC metadata, exclusive territory reservation, encrypted KYC fields, and application upload capability hashes. Migration 009 was applied locally on 2026-11-25; it verifies `crm_app` and `crm_migrator` without changing roles. Public APIs provide territory availability, rate-limited applications, email verification, and applicant KYC upload using an expiring, hash-stored capability plus CSRF. The API checks size, MIME, and file signature before storing in private S3-compatible storage. Authenticated downloads stream only through the API after role and partner-subtree checks; every successful view writes an immutable audit record. Partner profile UI supports uploads and private viewing. Admin APIs/UI provide application review, parent selection, approval/reject/request-info, partner list/detail, status suspend/reactivate, and encrypted PAN/GSTIN/address/bank fields with masking.

**Local checks, 2026-11-25:** `make check` passed lint, typecheck, unit tests, web/API build, Mongo integration (1/1), and Mongo authorization probe. Shared tests passed 9/9; API host unit invocation passed 9 with its DB integration skipped there; the Mongo integration ran against a throwaway MongoDB database and passed 1/1. It covers master/distributor approval and parent hierarchy, DB-backed self/downline scope, applicant capability upload, signed-in partner upload to RustFS, authorized download through the API with byte-for-byte content assertion, cross-partner denial, spoofed and oversized file rejection, and exactly one immutable view-audit record. It also checks encrypted KYC/masking and suspend/reactivate transitions. `make e2e` passed 6/6. Migration 009 applied successfully. All nine Compose services reported healthy; `http://localhost`, `http://localhost/api/health`, `http://localhost:8025`, and `http://localhost:8081` returned HTTP 200. Existing Mongo/Redis/storage volumes were preserved. `.dockerignore` excludes Turbo and Playwright artifacts to keep image build context small.

**Still required before M2 acceptance:** invite-driven lower-tier applications with enforced seat quota; KYC expiry reminders; partner 2FA reset; active-status assertions when transaction/top-up routes are introduced in M4/M5; and browser coverage of the full email verification, reviewer approval, invite/password setup, and pending-payment login flow (the API integration already exercises this flow). The admin partner list/detail and indented hierarchy view, partner network page, hierarchy scoping, private files, audit-on-view, encryption, and partner status transitions have local implementation and integration coverage. No later milestone has started.

Live Atlas checks are deferred by owner and remain a pre-release checklist before M10. See `docs/MILESTONES.md` and `docs/M1_GATE_REVIEW.md`.
