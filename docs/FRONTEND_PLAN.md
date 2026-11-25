# Frontend demo plan

Start point: branch `frontend-demo` from `m2-partner-onboarding` at `f1aff40`.

## Build steps

| Step | Scope                                                                                   | Status      |
| ---- | --------------------------------------------------------------------------------------- | ----------- |
| 1    | Shared types, API client, mock adapter, fixtures, theme and branding config, app shell  | Done        |
| 2    | Public site and authentication                                                          | Done        |
| 3    | Admin area                                                                              | Not started |
| 4    | Partner area                                                                            | Not started |
| 5    | Polish, responsive review at 375/768/1280 px, accessibility, performance/code splitting | Not started |
| 6    | Documentation and demo script                                                           | Not started |

## Screen checklist

Status means complete for the frontend demo, not merely present in the M2 implementation.

| Screen                                                              | Status      |
| ------------------------------------------------------------------- | ----------- |
| Shared app shell, navigation, theme, and brand config               | Done        |
| `/` public landing                                                  | Done        |
| `/services` catalogue                                               | Done        |
| `/plans` partner plans                                              | Done        |
| `/apply` application                                                | Done        |
| `/apply/verify` email verification                                  | Done        |
| `/apply/status` tokenized application status                        | Done        |
| `/order-status` tokenized customer order status                     | Done        |
| `/login` partner sign-in                                            | Done        |
| `/forgot-password`, `/reset-password` partner recovery              | Done        |
| `/2fa/verify` partner second factor                                 | Done        |
| `/admin/login`, `/admin/forgot-password` admin sign-in and recovery | Done        |
| `/admin/2fa/setup`, `/admin/2fa/verify` admin second factor         | Done        |
| `/change-password` forced password change                           | Done        |
| `/admin` dashboard                                                  | Not started |
| `/admin/applications` review queue                                  | Not started |
| `/admin/partners` partner management                                | Not started |
| `/admin/users` user management                                      | Not started |
| `/admin/audit` audit log                                            | Not started |
| `/admin/services` catalogue and pricing                             | Not started |
| `/admin/commissions` commission rules                               | Not started |
| `/admin/orders` order processing queue and detail                   | Not started |
| `/admin/wallet/topups` wallet top-up approvals                      | Not started |
| `/admin/ledger` immutable ledger viewer                             | Not started |
| `/admin/payouts` payout runs                                        | Not started |
| `/admin/tickets` support queue                                      | Not started |
| `/admin/reports` reports and CSV export                             | Not started |
| `/admin/content` content and notices                                | Not started |
| `/admin/roles` staff roles and permissions                          | Not started |
| `/admin/settings` GST and portal settings                           | Not started |
| `/partner` partner dashboard                                        | Not started |
| `/partner/profile` profile and KYC                                  | Not started |
| `/partner/network` partner network                                  | Not started |
| `/partner/services` service catalogue and dynamic order forms       | Not started |
| `/partner/orders` order list, detail, and status timeline           | Not started |
| `/partner/wallet` balance, top-up, ledger, and statements           | Not started |
| `/partner/commissions` commissions                                  | Not started |
| `/partner/payouts` payout history                                   | Not started |
| `/partner/customers` customer book                                  | Not started |
| `/partner/tickets` support tickets                                  | Not started |
| `/partner/notices` partner notices                                  | Not started |
| `/partner/team` staff management                                    | Not started |
| Shared notifications and global search                              | Not started |

## Review notes

## Owner prompt gap audit (2026-11-25)

The first two frontend commits cover the app shell and public/auth presentation, but they do not yet meet the complete demo prompt. These are tracked before proceeding to Step 3:

- **Closed in foundation repair:** the former transport was not typed/domain-organized; mock mode was opt-in; seeded data was sparse; changes did not persist; permissions, subtree scoping, lifecycle, append-only ledger, GST, audit, reset, and rule tests were absent. Shared Mongo-shaped domain schemas/types and typed API methods now exist, mock mode is default with HTTP fallback, state persists, the reset control exists, and core rules are enforced/tested. The login screen now exposes role-account shortcuts.
- **Closed in Step 2:** tokenized application status and customer order tracking, forced password change, and one-click per-role demo sign-ins are implemented and exercised in Playwright.
- **Still open in Step 3:** dashboard KPI/charts, KYC review actions/parent selection, services/pricing/commission rules, order processing and documents, wallet approvals, ledger, payout runs, tickets, reports/CSV, content/notices, staff/roles, audit, settings/GST, and full partner hierarchy management.
- **Still open in Step 4:** partner service forms/orders/timeline, wallet/top-ups/statements, commissions/payouts, customers, tickets, notices, staff management, and fuller profile/KYC interactions.
- **Working flows/tests:** apply → admin approval → partner login → top-up → order → processing → ledger/audit is not yet an end-to-end UI test. `docs/DEMO.md` and client-ready role walkthrough remain for Step 6.
- **Quality:** all 24 current routes have been rechecked for page/console errors and overflow at 375/768/1280 px; the added tablet header overflow was fixed. Accessibility review and performance/code splitting remain for Step 5, along with screenshots for admin/partner screens.

These gaps take precedence over treating the original Step 1/2 checklist as complete. Preserve the addendum's order: close the foundation/mock gaps, then complete public/auth gaps, then admin, partner, polish, and demo documentation. The screenshots and earlier checks remain valid evidence for the screens that were present at the time.

### Foundation gap repair status

- Shared Mongo record Zod schemas and inferred types now cover partners, wallets, ledger entries, orders/events, services, commissions, payouts, top-ups, tickets, customers, KYC, notifications, applications, audit, users, and roles. Web record types re-export shared types.
- `src/api/client.ts` provides typed domain methods. Mock and HTTP transports remain interchangeable in `src/lib/api-client.ts`; `VITE_API_MODE` defaults to `mock` through Next config.
- Mock seed is persisted in localStorage after mutations, supports a reset button, applies 200–500 ms latency and a configurable 1% simulated error rate, and guards mapped admin/partner endpoints with role permissions and partner hierarchy scoping. Unknown actions return 404 rather than generic fake success.
- Fixtures now include 1 super admin plus 5 admin staff in different roles, 2 master distributors, 6 distributors, 25 retailers, 150 orders, 6 services, 7 top-up requests, 8 payouts, 12 tickets, 35 customers, 99 ledger rows covering three months, notifications, KYC cases, and audit history.
- Mock tests cover shared schema validation, fixture counts, auth/403 rules, partner scoping, wallet debit and top-up credit via append-only ledger entries, audit writes, and legal order transitions. Full clickable business-flow UI coverage remains open until admin/partner steps are built.
- The shared shell's responsive header was adjusted for the wider mock controls. All 24 current routes were opened at 375, 768, and 1280 px; the browser check found no page/console errors or horizontal overflow. The 5 focused public/auth Playwright tests passed. Screenshots are refreshed in `docs/screenshots/`. `make dev` is not defined in the repository; the local mock-only equivalent is `pnpm --filter @franchise-crm/web dev`.

- Step 2 passed on the local site. All 21 existing routes were opened at 375, 768, and 1280 px; the browser check reported no page errors, console errors, or horizontal overflow. The 10-test Playwright suite passed, including partner/admin demo sign-in and public application submission.
- Public/auth screenshots at 1280 px are in `docs/screenshots/`; see that folder's README.
- Keep MongoDB as the primary database; Redis remains limited to sessions and queues.
- Mock data is the default. Set `VITE_API_MODE=http` to route requests to the real API.
- Keep the deferred M2 tasks listed in `docs/PROGRESS.md` until the demo is accepted.
- Do not merge `frontend-demo` to `main` without owner approval.
