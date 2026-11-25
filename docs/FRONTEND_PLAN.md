# Frontend demo plan

Start point: branch `frontend-demo` from `m2-partner-onboarding` at `f1aff40`.

## Build steps

| Step | Scope                                                                                   | Status                                    |
| ---- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1    | Shared types, API client, mock adapter, fixtures, theme and branding config, app shell  | Done                                      |
| 2    | Public site and authentication                                                          | Done                                      |
| 3    | Admin area                                                                              | Built; browser recheck blocked            |
| 4    | Partner area                                                                            | In progress; browser verification blocked |
| 5    | Polish, responsive review at 375/768/1280 px, accessibility, performance/code splitting | In progress; visual QA blocked            |
| 6    | Documentation and demo script                                                           | Done                                      |

## Screen checklist

Status means complete for the frontend demo, not merely present in the M2 implementation.

| Screen                                                              | Status                         |
| ------------------------------------------------------------------- | ------------------------------ |
| Shared app shell, navigation, theme, and brand config               | Done                           |
| `/` public landing                                                  | Done                           |
| `/services` catalogue                                               | Done                           |
| `/plans` partner plans                                              | Done                           |
| `/apply` application                                                | Done                           |
| `/apply/verify` email verification                                  | Done                           |
| `/apply/status` tokenized application status                        | Done                           |
| `/order-status` tokenized customer order status                     | Done                           |
| `/login` partner sign-in                                            | Done                           |
| `/forgot-password`, `/reset-password` partner recovery              | Done                           |
| `/2fa/verify` partner second factor                                 | Done                           |
| `/admin/login`, `/admin/forgot-password` admin sign-in and recovery | Done                           |
| `/admin/2fa/setup`, `/admin/2fa/verify` admin second factor         | Done                           |
| `/change-password` forced password change                           | Done                           |
| `/admin` dashboard                                                  | Done                           |
| `/admin/applications` review queue                                  | Done                           |
| `/admin/partners` partner management and hierarchy                  | Done                           |
| `/admin/users` user management                                      | Done                           |
| `/admin/audit` audit log                                            | Done                           |
| `/admin/services` catalogue and pricing                             | Done                           |
| `/admin/commissions` commission rules                               | Done                           |
| `/admin/orders` order processing, assignment, status, attachments   | Done                           |
| `/admin/wallet/topups` wallet top-up approvals                      | Done                           |
| `/admin/ledger` immutable ledger viewer                             | Done                           |
| `/admin/payouts` payout review and settlement                       | Done                           |
| `/admin/tickets` support queue                                      | Done                           |
| `/admin/reports` reports and CSV export                             | Done                           |
| `/admin/content` content and notices                                | Done                           |
| `/admin/roles` staff roles and permissions                          | Done                           |
| `/admin/settings` GST and portal settings                           | Done                           |
| `/partner` partner dashboard                                        | Built; browser recheck blocked |
| `/partner/profile` profile and KYC                                  | Built; browser recheck blocked |
| `/partner/network` partner network                                  | Built; browser recheck blocked |
| `/partner/services` service catalogue and dynamic order forms       | Built; browser recheck blocked |
| `/partner/orders` order list, detail, and status timeline           | Built; browser recheck blocked |
| `/partner/wallet` balance, top-up, ledger, and statements           | Built; browser recheck blocked |
| `/partner/commissions` commissions                                  | Built; browser recheck blocked |
| `/partner/payouts` payout history                                   | Built; browser recheck blocked |
| `/partner/customers` customer book                                  | Built; browser recheck blocked |
| `/partner/tickets` support tickets                                  | Built; browser recheck blocked |
| `/partner/notices` partner notices                                  | Built; browser recheck blocked |
| `/partner/team` staff and lower-tier invitations                    | Built; browser recheck blocked |
| Shared notifications and global search                              | Built; browser recheck blocked |
| Partner leads, learning, invoice builder, and lead pages            | Not started                    |

## Review notes

### Step 3 admin review (2026-11-25)

- Admin dashboard, application/KYC review and parent selection, partner hierarchy, users/roles, audit log, catalogue pricing, commission rates, order assignment and lifecycle, private mock document attachment, top-up approvals, immutable ledger, payout settlement, support queue, reports/CSV, partner notices, and GST settings have dedicated screens and mock actions.
- Mock mutations persist in local storage and write audit events. Money and approval actions require confirmation; role permissions gate the write controls and the mock adapter returns 403 for denied requests.
- Checks: web mock adapter 8/8; frontend Playwright suite 4/4, including all 35 current routes at 375/768/1280 px and the admin approval/settings/export/audit flow. Main admin screenshots are in `docs/screenshots/`.
- `make demo` runs only the mock Next.js frontend. `docs/DEMO.md` has launch instructions, role accounts, and a client walkthrough; refine that walkthrough after Step 4.
- Framework decision: this is Next.js App Router + React; the roadmap names React + Vite + React Router. Keep Next.js for this demo. Its current standalone Docker image needs Node hosting, and live same-origin `/api` requests rely on the existing Caddy proxy. Do not migrate without owner approval.

### Steps 3–6 continuation (2026-11-25)

- Step 3 code is present across the admin dashboard, operations, finance, reports, content, roles, and settings routes. Current lint, typecheck, unit tests, and production build pass. The browser suite was expanded to check named buttons, capture admin and partner route screenshots, and exercise a partner order/top-up/customer/ticket/team flow. The latest Playwright attempt failed before test execution because Chromium could not launch (`bootstrap_check_in ... Permission denied`); `make demo` also failed to bind port 3000 (`listen EPERM`). The prior admin-only Playwright pass is historical evidence, not a current full-suite pass.
- Step 4 now has mock-backed partner dashboard, catalogue/order creation, order tracking/query replies, wallet/top-ups/ledger, commissions, payouts, customers with consent, support tickets, notices, staff invitations/controls, network, profile/KYC, global search, and notifications. Web adapter tests cover scoped partner actions, KYC view audit, and team/customer/ticket mutations. The roadmap's partner leads, learning/marketing kit, invoice builder, and lead-page tools remain unbuilt and are listed as explicit gaps.
- Step 5 includes responsive layouts, reduced-motion styling, route-level Next.js splitting, and a route-sweep check for horizontal overflow and accessible button names. The 375/768/1280 px sweep, console review, visual accessibility review, and screenshots for the new partner pages remain unverified until the demo can bind a local port.
- Step 6 launch instructions and client flow are in `docs/DEMO.md`; `apps/web/README.md` now also has a short presenter run sheet. The demo target runs only the mock web app and does not launch Docker or a database. The browser demo itself could not be left running in this environment due to the port permission failure.
- Exact current checks: `pnpm lint` passed; `pnpm typecheck` passed; `pnpm test` passed (web 9/9, shared 16/16, API 9 passed and 1 Mongo-only test skipped); `pnpm build` passed and generated 46 routes. `make check` passed those local stages and stopped at Docker-backed integration with a Docker socket permission denial. Do not describe Mongo integration or the current browser sweep as passing.
- `BASE_URL=http://localhost:3000 pnpm exec playwright test e2e/frontend-demo-public-auth.spec.ts` was attempted; Chromium exited before test execution due Mach bootstrap permission denial. Starting the demo with `make demo` failed with `listen EPERM: operation not permitted 0.0.0.0:3000`. No local URL is currently verified reachable. Rerun Playwright and route sweeps after granting the workspace local browser and server permissions.

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
