# Identity module

## Purpose

Authentication, sessions, roles, and permissions.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Admin and partner identities use separate login routes; admin access requires TOTP; every route declares a permission. Sessions use Redis-backed opaque IDs in separate HTTP-only admin/partner cookies signed with `SESSION_SECRET`. State-changing requests require a CSRF header matching the CSRF cookie and active session. Admin sessions default to four hours; partner sessions to twelve hours.

Passwords use Argon2id. The first admin is created once from `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`; it must enroll TOTP before protected routes work. Ten one-time recovery codes are returned only at enrollment and stored as Argon2id hashes. Password reset links are one-use random tokens stored as hashes; email content is queued in MongoDB's `email_outbox` and retried by the worker.

Signed-in users can change their password after verifying the current password. The API hashes the replacement, revokes all sessions for that user, and appends an audit event; the profile UI sends the user back to sign in. Partner TOTP management and role-aware navigation are not complete yet.

`audit_log` is append-only through the API: its Mongoose model rejects updates/deletes and the migration defines a MongoDB `auditAppender` role limited to find/insert. The local Compose MongoDB still runs without authentication to preserve the existing development volume, so that role is not enforced by the local connection. Production deployment must bind the API database user to a least-privilege role before the M1 security gate.

`scopeToActor` fails closed for partner queries until M2 supplies a resolved partner hierarchy path.

## Tests that protect this module

Login/2FA lifecycle, recovery codes, lockout, permission denial, CSRF enforcement, reset-token use, audit safety, and partner-scope isolation. The integration suite requires a disposable Mongo replica set and Redis.
