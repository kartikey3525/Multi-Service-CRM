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

`audit_log` is append-only through the API: its Mongoose model rejects updates/deletes and the migration defines a MongoDB `auditAppender` role limited to find/insert/index discovery. Migrations `202611240003-identity-app-role.js` through `202611240005-runtime-role-discovery.js` define `crmApplication`, granting only required CRUD/index actions on identity collections and inheriting `auditAppender`. Production must supply distinct `MONGODB_URI` (runtime role) and `MONGODB_MIGRATION_URI` (migration operator) identities. The local Compose MongoDB remains unauthenticated to preserve the existing development volume, so these roles require a staging deployment check before the M1 security gate.

`scopeToActor` fails closed for partner queries until M2 supplies a resolved partner hierarchy path.

## Tests that protect this module

Login/2FA lifecycle for admin and partner accounts, recovery codes, lockout and rate limits, permission denial, CSRF enforcement, reset-token use, audit safety, and Mongo-backed partner-scope isolation. The integration suite requires a disposable Mongo replica set and Redis.
