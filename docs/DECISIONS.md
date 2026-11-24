# Decisions

Record implementation decisions and dependencies with date and reason.

## 2026-11-24 — monorepo tooling

- **Decision:** pnpm 12.11.2 workspaces, Turborepo, strict TypeScript defaults, ESLint, Prettier, and Husky/lint-staged hooks.
- **Reason:** M0-01 explicitly requires this repository baseline.

## 2026-11-24 — application stack and primary database

- **Decision:** Next.js web app and NestJS API, with MongoDB as the primary database, Mongoose for models, and migrate-mongo for migrations. Redis is reserved for sessions and queues; it is not a system-of-record database. The local object-storage container is RustFS; the S3 endpoint and credentials remain configurable so a hosted S3-compatible service can replace it.
- **Reason:** The roadmap marks D1/D8 as fixed and specifies Next.js/NestJS there; the owner explicitly selected MongoDB. The architecture's MongoDB/Mongoose details provide the matching persistence layer. This intentionally overrides the roadmap's conflicting PostgreSQL/Prisma option. Use the MongoDB replica set because money operations require transactions. Mongoose 9 is selected for MongoDB connections and data models; migrate-mongo manages forward-only migrations.

## 2026-11-24 — dependency build policy

- **Decision:** Allow the `esbuild` package install script; keep other dependency build scripts denied unless separately reviewed.
- **Reason:** pnpm 12 blocks dependency lifecycle scripts by default. `esbuild` was the only ignored build script during the initial install and is used by the TypeScript/build toolchain.

## 2026-11-24 — local S3-compatible object storage

- **Decision:** Use the official RustFS 1.0.5 container for local S3-compatible storage instead of MinIO.
- **Reason:** The documented `minio/minio` Docker Hub image is no longer pullable, and the upstream project is archived. RustFS publishes a pullable container with S3 API and health endpoints. The application continues to use the roadmap's S3-compatible storage interface through environment variables.

## 2026-11-24 — M0 test tooling

- **Decision:** Use Node's built-in test/assert APIs through `tsx` for TypeScript tests, Supertest for API HTTP integration checks, and Playwright Test for browser smoke checks. API integration tests create and drop a uniquely named database only when `MONGODB_TEST_URI` explicitly identifies a test database.
- **Reason:** This covers the roadmap's M0 shared-helper tests, API harness, data factory entry point, Playwright configuration, and Compose smoke workflow without adding a separate unit-test framework or introducing another database service.

## 2026-11-24 — M1 identity and access

- **Decision:** Use `@node-rs/argon2` with Argon2id, `ioredis` for opaque server-side sessions, `otplib` for TOTP, and Nodemailer for email delivery. Keep password-reset tokens hashed in MongoDB and put outbound messages in a MongoDB outbox polled by the worker with bounded exponential retries. Use separate admin/partner session cookies plus a session-bound CSRF token.
- **Reason:** This implements the roadmap's M1 security behavior while keeping MongoDB as the primary and audit data store. The Rust-backed Argon2 binding avoids unreviewed native install scripts in the container dependency stage. Redis stores only expiring session state.
- **Defaults pending owner review:** 5 failed logins / 15-minute lockout; admin 4-hour sessions; partner 12-hour sessions. Production rejects the development bootstrap password and requires a 64-hex field-encryption key and a non-development session secret.

## 2026-11-24 — immutable MongoDB database and owner gates

- **Decision:** `crm` stores mutable application data. `crm_immutable` stores `audit_log`, `ledger_entries`, and `order_events`. MongoDB Atlas users authenticate against `admin`; `crmApplication` has read/write on `crm` and only find/insert on `crm_immutable`. `crmMigrator` is a separate migration identity. API/worker use `MONGODB_URI`; migration jobs alone use `MONGODB_MIGRATE_URI`. Database migrations verify these externally provisioned roles and never create/update them.
- **Reason:** the owner explicitly approved this split and least-privilege shape. Redis remains limited to sessions and queues. Local Compose uses equivalent Mongo roles and preserves the prior `franchise_crm` database as a copy source; staging skips that local-only copy.
- **Owner decisions:** M1 is accepted on local checks; live staging authorization/demo is deferred until release preparation. GST rounds half-up per line; an odd intra-state paisa is assigned to SGST. Before M10, run Atlas principal/probe/demo checks and confirm the Atlas IP allowlist.
