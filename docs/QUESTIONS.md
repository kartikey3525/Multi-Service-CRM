# Open questions for the owner

1. **GST rounding convention — decided 2026-11-24.** Round half-up per line to the nearest paise. For intra-state tax, allocate any odd paise to SGST.

2. **Confirm account lockout defaults.** Implemented defaults: lock after 5 failed login attempts for 15 minutes. Both are environment-configurable.

3. **Confirm session duration defaults.** Implemented defaults: 4 hours for administrators and 12 hours for partners. Both are environment-configurable.

4. **Production MongoDB authorization.** Atlas roles are provisioned out of band. Migrations only verify required roles and prepare collections/indexes. Local MongoDB mirrors the `crm`/`crm_immutable` database split; staging authorization probes remain deferred until release preparation.

5. **M1 security threshold review.** Login and password-reset IP/account limits now use Redis expiring counters, in addition to account lockout. Review the configurable defaults against production traffic and the trusted one-hop proxy before staging.

The stack is settled in `docs/DECISIONS.md`: Next.js, NestJS, MongoDB/Mongoose, Redis for sessions and queues only, and RustFS for local S3-compatible object storage. The S3 endpoint can be replaced with another provider. The roadmap's full text is preserved in `docs/SPEC.md` and `docs/ARCHITECTURE.md`; where source extracts conflict with the recorded project decision, the project decision governs implementation.

6. **D-01 implementation audit.** The API has no `*.repository.ts` files yet; Mongoose queries are currently present in controllers/services. The static scope guard covers repository files as that layer is introduced; migrate queries into repositories before relying on it as complete endpoint coverage. The web uses Next.js App Router, React and shared Zod contracts; Tailwind CSS, shadcn/ui, React Hook Form and TanStack Query are not installed. `VITE_API_MODE` remains an inherited environment variable name in the Next.js app and should be renamed in a separate code task.

7. **Invoice PDF generation.** The partner demo invoice builder prints from the browser and does not generate a PDF. Use pdfmake when the real invoice API is implemented; confirm PDF layout and storage during that API task.

8. **Lead-page mock throttle default.** The demo limits accepted public capture submissions to three per IP and three per page slug in 60 seconds. Confirm the production API thresholds, expiry behavior, and trusted-proxy IP source when the real M7 endpoint is built.
