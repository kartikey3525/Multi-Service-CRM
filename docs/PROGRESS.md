# Progress

## S-01 — Branch sync (2026-11-26)

Verified `frontend-demo` is the integration branch. `main` tip `1a4a977` is its merge-base and `frontend-demo` is 12 commits ahead / 0 behind; `m2-partner-onboarding` tip `f1aff40` is its merge-base and `frontend-demo` is 10 commits ahead / 0 behind. `git merge --no-ff main` and `git merge --no-ff m2-partner-onboarding` both reported `Already up to date`; there were no incoming commits, changed-file conflict candidates, or conflicts to resolve. Repository scoping and the scope guard remain in the already-contained R-02 commits. No history rewrite, push, or main merge was performed.

**S-01 checks, 2026-11-26:** `make check` passed lint, typecheck, unit tests (web 15/15, shared 17/17, API 17 passed/2 Mongo-only skipped), and build (Next.js generated 50 routes; NestJS build passed). It stopped at `make api-test` because the Docker socket `/Users/admin/.docker/run/docker.sock` returned `permission denied`; `make mongo-probe` was not reached. The skipped named tests are `API readiness and repository partner scoping against a throwaway MongoDB database` and `parallel invoice issuing allocates gapless unique numbers in the invoice transaction`. No Mongo integration, authorization probe, server, or browser tests ran in this S-01 check. To run the Docker-backed checks locally: `make up-dev`, then `make api-test`, then `make mongo-probe` (or `make check` to run lint/typecheck/unit/build first as well). No Docker services were started here.

## R-01 — Progress reconciliation (2026-11-25)

The table records literal task checkboxes in this file. M0 tasks have explicit ticks; M1/M2 are described narratively and have no per-task ticks. The M1 Gate A owner acceptance is recorded; no other gate approval is inferred.

| Task  | Ticked here?        | Recorded evidence                                                                                                      | Owner gate approval                   |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| M0-01 | Yes                 | Foundation commit `433e3f3`; workspace/config files                                                                    | Not recorded                          |
| M0-02 | Yes                 | Compose health/smoke record; CI run `45361357670`                                                                      | Not recorded                          |
| M0-03 | Yes                 | Foundation commit `433e3f3`; `health.integration.test.ts`                                                              | Not recorded                          |
| M0-04 | Yes                 | Playwright smoke record; Next build                                                                                    | Not recorded                          |
| M0-05 | Yes                 | Foundation commit `433e3f3`; migration `202611240001-foundation-metadata.js` recorded applied; no migration test named | Not recorded                          |
| M0-06 | Yes                 | Foundation commit `433e3f3`; shared Money/permission/status unit tests                                                 | Not recorded                          |
| M0-07 | Yes                 | Hosted CI run `45361357670`                                                                                            | Not recorded                          |
| M0-08 | Yes                 | `health.integration.test.ts`; Playwright smoke, 3 passed                                                               | Not recorded                          |
| M1-01 | No (narrative only) | M1 Mongo integration and local immutability probe recorded in M1 section                                               | Gate A: accepted by owner, 2026-11-24 |
| M1-02 | No (narrative only) | `health.integration.test.ts` auth/session/reset flows                                                                  | Gate A: accepted by owner, 2026-11-24 |
| M1-03 | No (narrative only) | `health.integration.test.ts` TOTP/recovery flows                                                                       | Gate A: accepted by owner, 2026-11-24 |
| M1-04 | No (narrative only) | `health.integration.test.ts` reset outbox/token flow                                                                   | Gate A: accepted by owner, 2026-11-24 |
| M1-05 | No (narrative only) | `route-policy.test.ts`; lower-role 403 integration flow                                                                | Gate A: accepted by owner, 2026-11-24 |
| M1-06 | No (narrative only) | `actor.test.ts`; DB-backed hierarchy scope test                                                                        | Gate A: accepted by owner, 2026-11-24 |
| M1-07 | No (narrative only) | `health.integration.test.ts` audit tests and immutability assertion                                                    | Gate A: accepted by owner, 2026-11-24 |
| M1-08 | No (narrative only) | `pnpm e2e` 5/5 recorded for admin flows                                                                                | Gate A: accepted by owner, 2026-11-24 |
| M1-09 | No (narrative only) | `pnpm e2e` 5/5 recorded for partner auth/2FA flows                                                                     | Gate A: accepted by owner, 2026-11-24 |
| M1-10 | No (narrative only) | `health.integration.test.ts` database-backed partner path isolation                                                    | Gate A: accepted by owner, 2026-11-24 |
| M2-01 | No (narrative only) | Migrations 007–009 recorded applied; no migration test named                                                           | Not recorded                          |
| M2-02 | No (narrative only) | `health.integration.test.ts` application, verification, capability upload, file validation                             | Not recorded                          |
| M2-03 | No (narrative only) | `health.integration.test.ts` review decisions and KYC retrieval                                                        | Not recorded                          |
| M2-04 | No (narrative only) | `health.integration.test.ts` partner creation, hierarchy and parent rules                                              | Not recorded                          |
| M2-05 | No (narrative only) | Deferred M2 checklist; invite-driven applications/seat quotas not implemented                                          | Not recorded                          |
| M2-06 | No (narrative only) | `health.integration.test.ts` private upload/download, cross-partner denial, audit-on-view                              | Not recorded                          |
| M2-07 | No (narrative only) | `health.integration.test.ts` partner status and hierarchy tests; partner 2FA reset deferred                            | Not recorded                          |
| M2-08 | No (narrative only) | `health.integration.test.ts` encrypted KYC and masked display assertions                                               | Not recorded                          |
| M2-09 | No (narrative only) | `health.integration.test.ts` DB hierarchy scope; UI tree is present                                                    | Not recorded                          |

### Verification status

“Unverified” means no execution evidence after D-01 in this workspace; historical evidence remains noted in the relevant milestone section.

| Item                              | Last verified (date, by whom, how)                                                     | Status     |
| --------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| Mongo integration tests           | 2026-11-25, Codex, `make check` stopped before Docker-backed API integration           | unverified |
| Immutability probe                | 2026-11-24, Codex, local Mongo authorization probe recorded in M1 section              | unverified |
| DB-backed isolation tests         | 2026-11-24, Codex, Mongo integration path-isolation test recorded in M1/M2 sections    | unverified |
| Playwright suite                  | 2026-11-25, owner-reported prior run without pasted output; no run by Codex since D-01 | unverified |
| Responsive checks at 375/768/1280 | 2026-11-25, earlier recorded route sweep; no run by Codex since D-01                   | unverified |
| Accessibility checks              | No dated execution evidence recorded                                                   | unverified |

## R-02 — Repository scoping (in progress)

The baseline inventory below is from commit `ef7022e` before the refactor. Runtime partner-scoped access was concentrated in `PartnerModel`, `PartnerUserModel`, and `KycDocumentModel`; no real API models/queries for customers, orders, leads, wallets, invoices, or tickets exist yet (those screens are frontend mock data).

| Baseline file and line                                                           | Collection and operation                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/api/src/modules/files/files.service.ts:97`                                 | `kyc_documents` create                                                         |
| `apps/api/src/modules/files/files.service.ts:166,198`                            | `kyc_documents` retrieve by ID and partner list                                |
| `apps/api/src/modules/files/files.service.ts:237`                                | `partners` existence/status check                                              |
| `apps/api/src/modules/identity/auth.service.ts:205,210`                          | `partner_users` membership and `partners` profile lookup                       |
| `apps/api/src/modules/identity/permission.guard.ts:80,84,93`                     | membership, partner profile, and subtree expansion                             |
| `apps/api/src/modules/partners/admin-partners.controller.ts:74,88,93,96`         | partner list/detail, KYC list, downline count                                  |
| `apps/api/src/modules/partners/admin-partners.controller.ts:107,111,121,144,155` | partner status read/update, membership list, existence, encrypted-field update |
| `apps/api/src/modules/partners/applications.service.ts:219,230,340`              | application KYC list, eligible partner list, parent lookup                     |
| `apps/api/src/modules/partners/applications.service.ts:394,417,421`              | partner creation, membership creation, KYC owner transfer                      |
| `apps/api/src/modules/partners/partner-network.controller.ts:17,19`              | current partner and subtree read                                               |

All runtime calls for these three partner-scoped models now go through `apps/api/src/modules/partners/partners.repository.ts`. Global/public intake collections `applications` and `territories` remain part of the application workflow and are not partner-owned; their public token/capability filters are documented as a separate scope boundary. The static guard now fails on an import outside repositories/model definitions and on a repository query missing `scopeToActor` or the named, permission-checked `SCOPE_BYPASS`.

The Mongo-backed integration test now queries the subtree through `PartnersRepository` and asserts another partner is absent; KYC retrieval continues to assert an outside partner is denied. The endpoint suite asserts a partner role gets 403 from `/api/v1/admin/partners`.

**R-02 checks, 2026-11-25:** `make check` passed lint, typecheck, unit tests (web 15/15, shared 17/17, API 13 passed/1 Mongo-only integration skipped), and build (Next.js generated 50 routes; NestJS build passed). It stopped before API integration because Docker access was denied at `/Users/admin/.docker/run/docker.sock`. The named DB-backed test `API readiness and repository partner scoping against a throwaway MongoDB database` was skipped without `MONGODB_TEST_URI`; the repository subtree/KYC isolation assertions in that flow and the Mongo authorization probe did not run. No server or browser was started and Playwright, responsive, and accessibility checks were not run. Separate API lint, typecheck, unit tests, and build also passed after the repository change.

## D-01 — Stack reconciliation (in progress)

The repository uses Next.js App Router and NestJS on `@nestjs/platform-express`; MongoDB replica set/Mongoose/migrate-mongo; and BullMQ on Redis. Reconciled the roadmap and architecture docs to this implementation, documented the installed/missing web UI libraries, corrected the translation path, MongoDB runtime-role and repository-scoping language, and clarified that frontend Steps 4–6 are mock-adapter demo work rather than M7/M9/M10 completion. At D-01, the repository layer was not present; R-02 now addresses live partner-scoped model access and strengthens the test enforcement.

**D-01 verification, 2026-11-25:** `pnpm --filter @franchise-crm/api test` passed (11 passed, 1 Mongo-only integration skipped without `MONGODB_TEST_URI`). `make check` passed lint, typecheck, unit tests (web 10/10, shared 17/17, API 11 passed/1 skipped), and build (50 routes); its Docker API integration step could not connect to `/Users/admin/.docker/run/docker.sock` (`permission denied`), so Mongo integration and the authorization probe did not run. `make help` prints the stack and command list. `docker compose config` confirms the production-style web service has no volume mount; no services were started. D-01 docs/tests are committed as `9a1a91f`; Docker-backed checks remain outstanding in this environment.
Work in task order. M1 was accepted by the owner on local evidence; live staging checks are deferred until release preparation.

## Deferred M2 (until the frontend demo is accepted)

- [ ] Invite-driven lower-tier applications with enforced seat quotas.
- [ ] KYC expiry reminders through the worker.
- [ ] Partner 2FA reset controls.
- [ ] Browser acceptance flow from email verification through reviewer approval, invite/password setup, and pending-payment login.

These M2 items are intentionally paused while the frontend demo is built. Do not begin later backend milestones during this demo work.

## D-02 — Step 4 frontend mock acceptance (in progress)

Added failing-first mock tests for public lead honeypot/consent/rate limits and ownership, the ordered lead stages and terminal outcomes, partner_staff permission denial and cross-partner 404, invoice clients/history/parallel financial-year numbering/GST scope, and quiz scores/certificate gating. Implemented corresponding mock endpoints and shared schemas; no real API or database feature work was started. All new lead, learning, public capture, and invoice copy is in `apps/web/src/messages/en.json`.

**D-02 checks, 2026-11-25:** `make check` passed lint, typecheck, unit tests (web 15/15, shared 17/17, API 11 passed/1 Mongo-only skipped), and Next/Nest build (50 web routes). It then exited at the Docker API integration step with `permission denied` for `/Users/admin/.docker/run/docker.sock`; Mongo integration and the authorization probe did not run. Playwright was not run because the owner previously directed this session not to start a server or browser. Have the owner run `make demo` and `BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/frontend-demo-public-auth.spec.ts` in separate terminals; the suite includes the responsive route sweeps and screenshots. Do not merge to `main` or start M3.

## Frontend demo

- Branch: `frontend-demo`, created from M2 commit `f1aff40`.
- Step 1 foundation and Step 2 public/auth are complete. The prompt gap audit and detailed screen checklist are in `docs/FRONTEND_PLAN.md`.
- Step 3 admin screens and mock actions are implemented. Step 4 includes lead pages with honeypot, consent and mock throttling; terminal lead outcomes and partner staff denial; learning quizzes and a one-time certificate; saved invoice clients/history with partner/FY numbering, state-based GST and print; and partner-owned public lead capture. These actions persist in local demo data, enforce permission/partner scope and write audit entries.
- Step 5 includes responsive styles, reduced-motion and print styles, and a route sweep for page/console errors, named buttons, screenshots, and horizontal overflow at 375, 768, and 1280 px. Step 6 demo instructions and presenter run sheet are in `docs/DEMO.md` and `apps/web/README.md`.
- Checks on 2026-11-25: `make check` passed lint, typecheck, unit tests (web 15/15, shared 17/17, API 11 passed with one Mongo-only test skipped), and build (50 routes). It stopped at API integration because Docker socket access was denied; Mongo integration and authorization probe did not run. The owner-run Playwright/browser route sweep remains outstanding.
- Main public/auth/admin screenshots are already in `docs/screenshots/`. The updated Playwright route sweep will generate the new partner and public lead-page screenshots there. MongoDB remains the primary database; Redis remains limited to sessions and queues.
- Stack is Next.js App Router + React with a NestJS API; the production-style web container uses the standalone Node server and Caddy proxies same-origin API requests.
- Do not merge the demo branch to `main` without owner approval. M3 remains out of scope for this frontend demo.

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

Gate B is due at the end of M4 and is not yet applicable.

## M3-01 — Billing models and invoice numbering (in progress)

Added Mongoose models and forward migration `202611260010-plans-invoices-payments.js` for plans, invoices with embedded lines, payments, and number sequences. Invoice/payment repository reads use `scopeToActor`; permission checks and an unscoped invoice query fixture are covered. `InvoiceNumberService` uses the India Standard Time April-to-March financial year, format `YYYY-YY/000001`, and increments the sequence with `findOneAndUpdate` in the same transaction that inserts the issued invoice. Migration application and replica-set concurrency/isolation acceptance remain pending because MongoDB/Docker was unavailable; do not mark M3-01 accepted until the named integration test and migration run pass. M3-02 has not started.

**M3-01 local checks, 2026-11-26:** `make check` passed lint, typecheck, unit tests (web 15/15, shared 17/17, API 17 passed/2 Mongo-only skipped), and build (50 Next.js routes plus NestJS build). It stopped at `make api-test` because Docker access was denied at `/Users/admin/.docker/run/docker.sock`; `make mongo-probe` was not reached. The skipped DB-backed tests are `API readiness and repository partner scoping against a throwaway MongoDB database` and `parallel invoice issuing allocates gapless unique numbers in the invoice transaction`. `node --check apps/api/migrations/202611260010-plans-invoices-payments.js` passed. The migration was not applied. No server or browser was started. The invoice sequence concurrency and DB-backed invoice/payment isolation acceptance remain unverified.
