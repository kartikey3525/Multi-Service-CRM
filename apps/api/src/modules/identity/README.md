# Identity module

## Purpose

Authentication, sessions, roles, and permissions.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Admin and partner identities use separate login routes; admin access requires TOTP; every route declares a permission. Sessions use Redis-backed opaque IDs in separate HTTP-only admin/partner cookies signed with `SESSION_SECRET`. State-changing requests require a CSRF header matching the CSRF cookie and active session. Admin sessions default to four hours; partner sessions to twelve hours.

Passwords use Argon2id. The first admin is created once from `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`; it must enroll TOTP before protected routes work. Ten one-time recovery codes are returned only at enrollment and stored as Argon2id hashes. Password reset links are one-use random tokens stored as hashes; email content is queued in MongoDB's `email_outbox` and retried by the worker.

Signed-in users can change their password after verifying the current password. The API hashes the replacement, revokes all sessions for that user, and appends an audit event; the profile UI sends the user back to sign in. Partners may enroll TOTP from their profile, receive one-time recovery codes, and disable it after reauthentication with their password and a current TOTP or unused recovery code. TOTP changes revoke all active sessions.

Login requests are throttled per IP and per normalized identity; password-reset requests are throttled per IP and account. Express trusts one reverse-proxy hop for client IP attribution. Redis stores only expiring counters for these limits, sessions, CSRF state, and queues; it is not a database. Defaults are 60 login requests per IP and 10 per account per 15 minutes, plus 30 reset requests per IP and 3 per account per 15 minutes. Keep the API behind the trusted Caddy proxy and tune thresholds for deployment traffic.

`audit_log` is append-only in the `crm_immutable` database. The Mongoose model rejects updates/deletes and the Mongo runtime role grants only `find` and `insert` on that database. Mutable identity collections remain in `crm`. Atlas roles are provisioned outside database migrations; migrations verify role presence and prepare collections/indexes only. `crmMigrator` needs permission to inspect its role definitions (MongoDB `viewRole`) as well as the migration/schema actions. API and worker receive authenticated `MONGODB_URI`; the one-shot `migrator` receives `MONGODB_MIGRATE_URI` only. Local development uses matching `crm_app` / `crm_migrator` identities while preserving the existing Mongo volume. Live Atlas authorization probes and identity demo are deferred by the owner until release preparation; see `docs/M1_GATE_REVIEW.md`.

For partner requests, the permission guard resolves the active `partner_users` membership and expands the Mongo materialized path to the partner's own subtree. `scopeToActor` uses those allowed partner IDs and fails closed when the membership or hierarchy is missing. The M2 integration harness exercises a database-backed self/downline query and excludes partners outside that subtree. Write requests are blocked for non-active partners except KYC upload while pending payment; future order/top-up routes must keep the active-only requirement.

## Tests that protect this module

Login/2FA lifecycle for admin and partner accounts, recovery codes, lockout and rate limits, permission denial, CSRF enforcement, reset-token use, audit safety, and Mongo-backed partner-scope isolation. The integration suite requires a disposable Mongo replica set and Redis.
