# Open questions for the owner

1. **Confirm money rounding conventions.** The roadmap asks for GST rounding rules without specifying the rule. Implemented default: round percentage calculations half-up to the nearest paise; on an intra-state split, CGST receives the lower half and SGST receives any remaining odd paise so totals reconcile.

2. **Confirm account lockout defaults.** Implemented defaults: lock after 5 failed login attempts for 15 minutes. Both are environment-configurable.

3. **Confirm session duration defaults.** Implemented defaults: 4 hours for administrators and 12 hours for partners. Both are environment-configurable.

4. **Production MongoDB authorization.** Forward migrations define `auditAppender` and the least-privilege `crmApplication` role. The local MongoDB volume remains unauthenticated; the M1 staging gate is recorded in `docs/M1_GATE_REVIEW.md` and remains open until separate authenticated principals are provisioned and denied writes to `audit_log` are verified there.

5. **M1 security threshold review.** Login and password-reset IP/account limits now use Redis expiring counters, in addition to account lockout. Review the configurable defaults against production traffic and the trusted one-hop proxy before staging.

The stack is settled in `docs/DECISIONS.md`: Next.js, NestJS, MongoDB/Mongoose, Redis for sessions and queues only, and RustFS for local S3-compatible object storage. The S3 endpoint can be replaced with another provider. The roadmap's full text is preserved in `docs/SPEC.md` and `docs/ARCHITECTURE.md`; where source extracts conflict with the recorded project decision, the project decision governs implementation.
