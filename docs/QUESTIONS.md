# Open questions for the owner

1. **Confirm money rounding conventions.** The roadmap asks for GST rounding rules without specifying the rule. Implemented default: round percentage calculations half-up to the nearest paise; on an intra-state split, CGST receives the lower half and SGST receives any remaining odd paise so totals reconcile.

2. **Confirm account lockout defaults.** Implemented defaults: lock after 5 failed login attempts for 15 minutes. Both are environment-configurable.

3. **Confirm session duration defaults.** Implemented defaults: 4 hours for administrators and 12 hours for partners. Both are environment-configurable.

4. **Production MongoDB authorization.** The M1 migration creates an `auditAppender` role limited to find/insert on `audit_log`, and the API model rejects audit updates/deletes. The local MongoDB volume remains unauthenticated; before staging, create an application MongoDB principal with the custom least-privilege collection grants and use its authenticated URI.

5. **M1 security hardening.** Account lockout is implemented, but IP/account rate limits for login and password reset are not yet wired. These must be in place before staging; account lockout alone does not protect against distributed attempts or reset-email abuse.

The stack is settled in `docs/DECISIONS.md`: Next.js, NestJS, MongoDB/Mongoose, Redis for sessions and queues only, and RustFS for local S3-compatible object storage. The S3 endpoint can be replaced with another provider. The roadmap's full text is preserved in `docs/SPEC.md` and `docs/ARCHITECTURE.md`; where source extracts conflict with the recorded project decision, the project decision governs implementation.
