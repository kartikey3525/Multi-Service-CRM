# Open questions for the owner

11. **Screenshot tracking:** Should generated demo screenshots under `docs/screenshots/` stay tracked in Git, or should they be ignored and regenerated locally/on demand?

1. **GST rounding convention — decided 2026-11-24.** Round half-up per line to the nearest paise. For intra-state tax, allocate any odd paise to SGST.

1. **Confirm account lockout defaults.** Implemented defaults: lock after 5 failed login attempts for 15 minutes. Both are environment-configurable.

1. **Confirm session duration defaults.** Implemented defaults: 4 hours for administrators and 12 hours for partners. Both are environment-configurable.

1. **Production MongoDB authorization.** Atlas roles are provisioned out of band. Migrations only verify required roles and prepare collections/indexes. Local MongoDB mirrors the `crm`/`crm_immutable` database split; staging authorization probes remain deferred until release preparation.

1. **M1 security threshold review.** Login and password-reset IP/account limits now use Redis expiring counters, in addition to account lockout. Review the configurable defaults against production traffic and the trusted one-hop proxy before staging.

The stack is settled in `docs/DECISIONS.md`: Next.js, NestJS, MongoDB/Mongoose, Redis for sessions and queues only, and RustFS for local S3-compatible object storage. The S3 endpoint can be replaced with another provider. The roadmap's full text is preserved in `docs/SPEC.md` and `docs/ARCHITECTURE.md`; where source extracts conflict with the recorded project decision, the project decision governs implementation.

6. **D-01 implementation audit.** R-02 moved live accesses to partner-scoped `partners`, `partner_users`, and `kyc_documents` collections into `PartnersRepository`; the static test rejects model imports outside repositories/model definitions. Application and territory intake remains in its public/admin application workflow. The web uses Next.js App Router, React and shared Zod contracts; Tailwind CSS, shadcn/ui, React Hook Form and TanStack Query are not installed. `VITE_API_MODE` remains an inherited environment variable name in the Next.js app and should be renamed in a separate code task.

7. **Invoice PDF generation.** The partner demo invoice builder prints from the browser and does not generate a PDF. Use pdfmake when the real invoice API is implemented; confirm PDF layout and storage during that API task.

8. **Lead-page mock throttle default.** The demo limits accepted public capture submissions to three per IP and three per page slug in 60 seconds. Confirm the production API thresholds, expiry behavior, and trusted-proxy IP source when the real M7 endpoint is built.

9. **R-01 roadmap/code reconciliation.** M2 implementation code exists without per-task checkboxes in `docs/PROGRESS.md`: `apps/api/src/modules/partners/` covers territories, applications, partner provisioning/hierarchy, admin partner status, and partner network; `apps/api/src/modules/files/` covers private KYC upload/retrieval; `apps/api/src/modules/identity/` provides user/role/session/permission/audit behavior; M2 tests live primarily in `apps/api/test/health.integration.test.ts`. M2-05 seat-limited invites and the M2-07 partner 2FA reset remain deferred. Frontend demo screens for orders, invoices, wallets, customers, leads, tickets, and learning are mock-only work and do not satisfy backend roadmap tasks M3+ or M7/M9/M10. The R-02 runtime model-access inventory and its remaining non-partner-owned public intake boundary are recorded in `docs/PROGRESS.md`. M0-01 has no dedicated automated test named in progress evidence; M0-05 has an applied-migration record but no migration test named. Other M0/M1 ticked tasks have the test or CI evidence cited in the R-01 table; M2 items are not ticked.

10. **M3-01 billing defaults.** Where DATA_MODEL 8.3 does not specify formatting or timezone, invoice numbers use `YYYY-YY/000001` and financial-year boundaries use India Standard Time (UTC+05:30), consistent with the GST/Indian billing context. Payments duplicate `partnerId` from their invoice so the required repository scope can be applied directly. Payment method values remain free-form strings until M3-05 defines the supported methods.
