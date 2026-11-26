# ARCHIVED — use [ROADMAP.md](ROADMAP.md) for current task numbering and status.

# Frontend demo plan

> Steps 4–6 are the frontend demo track on mock adapters. They do not mark or
> complete M7, M9, or M10 backend milestone tasks.

Start point: branch `frontend-demo` from `m2-partner-onboarding` at `f1aff40`.

## Build steps

| Step | Scope                                                                                   | Status                                               |
| ---- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1    | Shared types, API client, mock adapter, fixtures, theme and branding config, app shell  | Done                                                 |
| 2    | Public site and authentication                                                          | Done                                                 |
| 3    | Admin area                                                                              | Built; owner run output not supplied                 |
| 4    | Partner area                                                                            | Built; mock acceptance passes; browser check pending |
| 5    | Polish, responsive review at 375/768/1280 px, accessibility, performance/code splitting | Implemented, browser-unverified                      |
| 6    | Documentation and demo script                                                           | Implemented, browser-unverified                      |

## Screen checklist

Status means complete for the frontend demo, not merely present in the M2 implementation.

| Screen                                                                | Status                                 |
| --------------------------------------------------------------------- | -------------------------------------- |
| Shared app shell, navigation, theme, and brand config                 | Done                                   |
| `/` public landing                                                    | Done                                   |
| `/services` catalogue                                                 | Done                                   |
| `/plans` partner plans                                                | Done                                   |
| `/apply` application                                                  | Done                                   |
| `/apply/verify` email verification                                    | Done                                   |
| `/apply/status` tokenized application status                          | Done                                   |
| `/order-status` tokenized customer order status                       | Done                                   |
| `/login` partner sign-in                                              | Done                                   |
| `/forgot-password`, `/reset-password` partner recovery                | Done                                   |
| `/2fa/verify` partner second factor                                   | Done                                   |
| `/admin/login`, `/admin/forgot-password` admin sign-in and recovery   | Done                                   |
| `/admin/2fa/setup`, `/admin/2fa/verify` admin second factor           | Done                                   |
| `/change-password` forced password change                             | Done                                   |
| `/admin` dashboard                                                    | Done                                   |
| `/admin/applications` review queue                                    | Done                                   |
| `/admin/partners` partner management and hierarchy                    | Done                                   |
| `/admin/users` user management                                        | Done                                   |
| `/admin/audit` audit log                                              | Done                                   |
| `/admin/services` catalogue and pricing                               | Done                                   |
| `/admin/commissions` commission rules                                 | Done                                   |
| `/admin/orders` order processing, assignment, status, attachments     | Done                                   |
| `/admin/wallet/topups` wallet top-up approvals                        | Done                                   |
| `/admin/ledger` immutable ledger viewer                               | Done                                   |
| `/admin/payouts` payout review and settlement                         | Done                                   |
| `/admin/tickets` support queue                                        | Done                                   |
| `/admin/reports` reports and CSV export                               | Done                                   |
| `/admin/content` content and notices                                  | Done                                   |
| `/admin/roles` staff roles and permissions                            | Done                                   |
| `/admin/settings` GST and portal settings                             | Done                                   |
| `/partner` partner dashboard                                          | Built; browser recheck blocked         |
| `/partner/profile` profile and KYC                                    | Built; browser recheck blocked         |
| `/partner/network` partner network                                    | Built; browser recheck blocked         |
| `/partner/services` service catalogue and dynamic order forms         | Built; browser recheck blocked         |
| `/partner/orders` order list, detail, and status timeline             | Built; browser recheck blocked         |
| `/partner/wallet` balance, top-up, ledger, and statements             | Built; browser recheck blocked         |
| `/partner/commissions` commissions                                    | Built; browser recheck blocked         |
| `/partner/payouts` payout history                                     | Built; browser recheck blocked         |
| `/partner/customers` customer book                                    | Built; browser recheck blocked         |
| `/partner/leads` ordered lead pipeline, consent, terminal outcomes    | Mock tests pass; browser check pending |
| `/partner/tickets` support tickets                                    | Built; browser recheck blocked         |
| `/partner/notices` partner notices                                    | Built; browser recheck blocked         |
| `/partner/learn` quizzes, persisted scores, one-time certificate, kit | Mock tests pass; browser check pending |
| `/partner/tools/invoice` clients, FY numbering, GST history and print | Mock tests pass; browser check pending |
| `/partner/tools/lead-pages` create, publish, preview capture pages    | Mock tests pass; browser check pending |
| `/p/[slug]` public consent capture, honeypot, mock rate limit         | Mock tests pass; browser check pending |
| `/partner/team` staff and lower-tier invitations                      | Built; browser recheck blocked         |
| Shared notifications and global search                                | Built; browser recheck blocked         |

## Review notes

### Step 3 admin review (2026-11-25)

- Admin dashboard, application/KYC review and parent selection, partner hierarchy, users/roles, audit log, catalogue pricing, commission rates, order assignment and lifecycle, private mock document attachment, top-up approvals, immutable ledger, payout settlement, support queue, reports/CSV, partner notices, and GST settings have dedicated screens and mock actions.
- Mock mutations persist in local storage and write audit events. Money and approval actions require confirmation; role permissions gate the write controls and the mock adapter returns 403 for denied requests.
- Checks: web mock adapter 8/8; frontend Playwright suite 4/4, including all 35 current routes at 375/768/1280 px and the admin approval/settings/export/audit flow. Main admin screenshots are in `docs/screenshots/`.
- `make demo` runs only the mock Next.js frontend. `docs/DEMO.md` has launch instructions, role accounts, and a client walkthrough; refine that walkthrough after Step 4.
- D-01 reconciles the web stack to the repository: Next.js App Router runs as a standalone Node server, while Caddy routes same-origin `/api` calls to the NestJS API.

### Steps 3–6 continuation (2026-11-25)

- Step 3 code is present across the admin dashboard, operations, finance, reports, content, roles, and settings routes. Current lint, typecheck, unit tests, and production build pass. The owner reports running the site and Playwright; the pass/fail text was not included, so the Admin browser result is unconfirmed here.
- Step 4 now includes partner leads with consent and sequential stages; learning progress; downloadable marketing copy; integer-paise GST calculation/print preview; draft/publish lead pages; and a public consent-gated capture form. Mock API tests cover partner scoping, progression rules, persistence, and audit events. The owner-run browser output was not included, and the suite has since been expanded to cover these flows.
- Step 5 includes responsive layouts, reduced-motion styling, print styling, Next route-level splitting, and an automated route sweep for horizontal overflow, page/console errors, screenshots, and accessible button names. The updated suite covers the added screens. The latest browser review remains unverified; this agent did not launch a browser or server, per owner instruction.
- Step 6 launch instructions and the expanded client walkthrough are in `docs/DEMO.md`; `apps/web/README.md` has a concise presenter run sheet. `make demo` runs only the mock web app and requires no database service.
- Exact current checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed. Unit counts: web 10/10, shared 17/17, API 9 passed and 1 Mongo-only test skipped. The build generated 50 routes. The owner says `make demo` and Playwright were run, but the result placeholder arrived without output. Run `BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/frontend-demo-public-auth.spec.ts` to verify latest flows and route sweeps at 375/768/1280 px. Docker-backed API and Mongo probes require `make check` with the local stack running.

## Owner prompt gap audit (2026-11-25)

The first two frontend commits cover the app shell and public/auth presentation, but they do not yet meet the complete demo prompt. These are tracked before proceeding to Step 3:

- **Closed in foundation repair:** the former transport was not typed/domain-organized; mock mode was opt-in; seeded data was sparse; changes did not persist; permissions, subtree scoping, lifecycle, append-only ledger, GST, audit, reset, and rule tests were absent. Shared Mongo-shaped domain schemas/types and typed API methods now exist, mock mode is default with HTTP fallback, state persists, the reset control exists, and core rules are enforced/tested. The login screen now exposes role-account shortcuts.
- **Closed in Step 2:** tokenized application status and customer order tracking, forced password change, and one-click per-role demo sign-ins are implemented and exercised in Playwright.
- **Closed in Step 3:** all admin routes in the screen checklist are built with mock-backed reads and actions. Persistence for the demo-only catalogue/rates/notices/settings and true order-document storage still belong to backend integration.
- **Still open in Step 4:** partner service forms/orders/timeline, wallet/top-ups/statements, commissions/payouts, customers, tickets, notices, staff management, and fuller profile/KYC interactions.
- **Working flows/tests:** apply → admin approval → partner login → top-up → order → processing → ledger/audit is not yet an end-to-end UI test. `docs/DEMO.md` and client-ready role walkthrough remain for Step 6.
- **Quality:** all 35 current routes were rechecked for page/console errors and overflow at 375/768/1280 px; no errors or overflow were observed. Accessibility review and performance/code splitting remain for Step 5, along with partner screenshots.

These gaps take precedence over treating the original Step 1/2 checklist as complete. Preserve the addendum's order: close the foundation/mock gaps, then complete public/auth gaps, then admin, partner, polish, and demo documentation. The screenshots and earlier checks remain valid evidence for the screens that were present at the time.

### Foundation gap repair status

- Shared Mongo record Zod schemas and inferred types now cover partners, wallets, ledger entries, orders/events, services, commissions, payouts, top-ups, tickets, customers, KYC, notifications, applications, audit, users, and roles. Web record types re-export shared types.
- `src/api/client.ts` provides typed domain methods. Mock and HTTP transports remain interchangeable in `src/lib/api-client.ts`; `VITE_API_MODE` defaults to `mock` through Next config.
- Mock seed is persisted in localStorage after mutations, supports a reset button, applies 200–500 ms latency and a configurable 1% simulated error rate, and guards mapped admin/partner endpoints with role permissions and partner hierarchy scoping. Unknown actions return 404 rather than generic fake success.
- Fixtures now include 1 super admin plus 5 admin staff in different roles, 2 master distributors, 6 distributors, 25 retailers, 150 orders, 6 services, 7 top-up requests, 8 payouts, 12 tickets, 35 customers, 99 ledger rows covering three months, notifications, KYC cases, and audit history.
- Mock tests cover shared schema validation, fixture counts, auth/403 rules, partner scoping, wallet debit and top-up credit via append-only ledger entries, audit writes, and legal order transitions. Full clickable business-flow UI coverage remains open until admin/partner steps are built.
- All 35 current routes were opened at 375, 768, and 1280 px; the browser check found no page/console errors or horizontal overflow. The frontend Playwright suite passed 4/4. Screenshots are refreshed in `docs/screenshots/`. Start the mock-only site with `make demo` or `pnpm --filter @franchise-crm/web dev`.

- Step 2 passed on the local site. All 21 existing routes were opened at 375, 768, and 1280 px; the browser check reported no page errors, console errors, or horizontal overflow. The 10-test Playwright suite passed, including partner/admin demo sign-in and public application submission.
- Public/auth screenshots at 1280 px are in `docs/screenshots/`; see that folder's README.
- Keep MongoDB as the primary database; Redis remains limited to sessions and queues.
- Mock data is the default. Set `VITE_API_MODE=http` to route requests to the real API.
- Keep the deferred M2 tasks listed in `docs/PROGRESS.md` until the demo is accepted.
- Do not merge `frontend-demo` to `main` without owner approval.

### Step 4 acceptance additions

- Lead pages now use `/p/[slug]`, a silent honeypot discard, required consent, per-IP and per-slug mock limits with `RATE_LIMITED`, and owner-partner assignment. Lead stages follow `new → contacted → qualified → won`, with `lost` from active stages and both outcomes terminal. `partner_staff` without lead permissions receives 403; records from another partner are hidden with 404.
- The invoice tool has partner-scoped clients and history, parallel gapless numbering per partner and April–March financial year, client-state tax selection using shared paise/Money calculations, and browser print. PDF generation is tracked in `docs/QUESTIONS.md` for the real API.
- Learning persists per-demo-user completion and quiz scores; every lesson has a multiple-choice quiz with an 80% pass mark, and the printable completion certificate is issued once after every lesson and quiz passes.
- The focused mock suite now covers these contracts. Browser checks and new partner screenshots await the owner-run Playwright command because the browser/server were not started in this workspace.

## F-01 — SPEC §4 route audit (2026-11-26)

`SPEC.md` route strings are compared literally with Next.js App Router `page.tsx` routes. “Mock adapter” means the current demo uses the default local mock transport; absent routes have no adapter use. Prior notes report a 35-route Playwright sweep and a 4/4 suite but do not map individual paths or identify exactly which 35 routes were included. The table therefore records aggregate evidence without claiming route-specific verification.

| Route                       | Exists in app                                 | Mock adapter                                      | Responsive checked                                    | Browser-verified                                      | Gap                                                  |
| --------------------------- | --------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `/`                         | Yes                                           | Yes                                               | Aggregate 35-route sweep recorded; membership unknown | Aggregate Playwright 4/4 recorded; membership unknown | Route-specific verification pending                  |
| `/plans`                    | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Route-specific verification pending                  |
| `/services`                 | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Route-specific verification pending                  |
| `/apply`                    | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Route-specific verification pending                  |
| `/income-calculator`        | No                                            | No                                                | No                                                    | No                                                    | Build calculator page                                |
| `/login`                    | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Route-specific verification pending                  |
| `/admin/login`              | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Route-specific verification pending                  |
| `/status/[token]`           | No; app uses `/order-status` with query token | No on specified route; demo counterpart uses mock | No on specified route                                 | No on specified route                                 | Implement spec path or record compatibility decision |
| `/terms`                    | No                                            | No                                                | No                                                    | No                                                    | Add owner-provided legal content route               |
| `/privacy`                  | No                                            | No                                                | No                                                    | No                                                    | Add owner-provided legal content route               |
| `/refunds`                  | No                                            | No                                                | No                                                    | No                                                    | Add owner-provided legal content route               |
| `/partner`                  | Yes                                           | Yes                                               | Aggregate 35-route sweep recorded; membership unknown | Aggregate Playwright 4/4 recorded; membership unknown | Re-map and verify route                              |
| `/partner/wallet`           | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/partner/orders/new`       | No; order creation is on `/partner/services`  | No on specified route                             | No on specified route                                 | No on specified route                                 | Add dedicated new-order flow/route                   |
| `/partner/orders`           | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/partner/orders/[id]`      | No dedicated dynamic route                    | No on specified route                             | No on specified route                                 | No on specified route                                 | Add deep-linkable order detail route                 |
| `/partner/customers`        | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Confirm detail/history coverage and verify           |
| `/partner/leads`            | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | No route-specific result recorded                     | Run browser flow and record evidence                 |
| `/partner/commissions`      | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/partner/network`          | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/partner/team`             | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/partner/support`          | No; equivalent is `/partner/tickets`          | No on specified route; counterpart uses mock      | No on specified route                                 | No on specified route                                 | Align route or add redirect/alias                    |
| `/partner/learn`            | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | No route-specific result recorded                     | Run browser flow and record evidence                 |
| `/partner/tools/invoice`    | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | No route-specific result recorded                     | Run browser flow and record evidence                 |
| `/partner/tools/lead-pages` | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | No route-specific result recorded                     | Run browser flow and record evidence                 |
| `/partner/profile`          | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/admin`                    | Yes                                           | Yes                                               | Aggregate 35-route sweep recorded; membership unknown | Aggregate Playwright 4/4 recorded; membership unknown | Re-map and verify route                              |
| `/admin/applications`       | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify approval flow                      |
| `/admin/partners`           | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/admin/plans`              | No                                            | No                                                | No                                                    | No                                                    | Build plan management route                          |
| `/admin/services`           | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify service editing flow                          |
| `/admin/forms`              | No                                            | No                                                | No                                                    | No                                                    | Build service form builder route                     |
| `/admin/orders`             | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify order processing flow                         |
| `/admin/wallet-requests`    | No; equivalent is `/admin/wallet/topups`      | No on specified route; counterpart uses mock      | No on specified route                                 | No on specified route                                 | Align route or add redirect/alias                    |
| `/admin/ledger`             | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/admin/commissions`        | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/admin/payouts`            | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify settlement flow                               |
| `/admin/tickets`            | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Re-map and verify route                              |
| `/admin/reports`            | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify report and CSV flow                           |
| `/admin/users`              | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify role/user actions                             |
| `/admin/content`            | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify editor actions                                |
| `/admin/settings`           | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify settings forms                                |
| `/admin/audit`              | Yes                                           | Yes                                               | Aggregate only; membership unknown                    | Aggregate only; membership unknown                    | Verify audit filters                                 |

## Ordered frontend work after F-01

Each item is scoped for one implementation/test/docs commit. Work prioritizes visible dashboards and operational gaps.

1. **F-02 — Partner dashboard:** finish the seeded overview, empty/error states, and working links/actions; add mock tests and route coverage.
2. **F-03 — Admin dashboard:** make each summary/action lead to its filtered queue; test role-aware behavior and seeded states.
3. **F-04 — Order journeys:** add `/partner/orders/new`, deep-linkable `/partner/orders/[id]`, and verify admin assignment/status/output flow.
4. **F-05 — Wallet journeys:** verify partner top-up proof, statement/export, and admin wallet-request decisions end to end in the mock demo.
5. **F-06 — Applications:** complete application status and admin review lifecycle, with document, empty/error and verification states.
6. **F-07 — Services and form builder:** add `/admin/plans` and `/admin/forms`; complete service configuration and partner dynamic order forms.
7. **F-08 — Tickets:** align `/partner/support` and `/partner/tickets`, then verify create/reply/close and admin queue workflows.
8. **F-09 — Reports:** cover report filters, drill-down, and CSV export with deterministic seed assertions.
9. **F-10 — Settings:** finish company/GST, numbering, email-template, SLA, and threshold forms with validation and persistence.
10. **F-11 — Public route gaps:** add income calculator, legal routes, and `/status/[token]` compatibility; cover mock and empty/error states.
11. **F-12 — Browser acceptance map:** run each SPEC §4 and extra demo route at 375/768/1280 px and accessibility checks; fix findings and record per-route results/screenshots.
