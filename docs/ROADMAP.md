# Delivery roadmap — single task tracker

Priority is Phase A (frontend on demo data), then Phase B (backend one feature at a time), then Phase C. Do not skip ahead. MongoDB is primary; Redis is only sessions/queues. Each task is one commit. Tests first. Every API endpoint needs permission and cross-partner scope tests; money is integer paise. Ledger and commission code require owner line-by-line review. Gates: A end B1, B end B4, C end B6, D end B9; do not cross a gate without owner approval. Phase B switches one feature at a time from demo to API only after tests pass.

## Phase A — frontend on demo data

| Task | Screen group and routes (each SPEC §4 route listed once)                                                                                   | State |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| A1   | Partner/admin dashboards: `/partner`, `/admin`                                                                                             | [ ]   |
| A2   | New order and order detail: `/partner/orders/new`, `/partner/orders`, `/partner/orders/[id]`, `/admin/orders`                              | [ ]   |
| A3   | Wallet: `/partner/wallet`, `/admin/wallet-requests`, `/admin/ledger`                                                                       | [ ]   |
| A4   | Applications and partner admin: `/apply`, `/admin/applications`, `/admin/partners`                                                         | [ ]   |
| A5   | Plans: `/plans`, `/admin/plans`                                                                                                            | [ ]   |
| A6   | Services and form builder: `/services`, `/admin/services`, `/admin/forms`                                                                  | [ ]   |
| A7   | Customers and leads: `/partner/customers`, `/partner/leads`                                                                                | [ ]   |
| A8   | Commissions and payouts: `/partner/commissions`, `/admin/commissions`, `/admin/payouts`                                                    | [ ]   |
| A9   | Tickets: `/partner/support`, `/admin/tickets`                                                                                              | [ ]   |
| A10  | Reports: `/admin/reports`                                                                                                                  | [ ]   |
| A11  | Settings and audit: `/admin/settings`, `/admin/audit`, `/admin/users`                                                                      | [ ]   |
| A12  | Content and learning: `/partner/learn`, `/admin/content`                                                                                   | [ ]   |
| A13  | Partner tools/team/profile: `/partner/tools/invoice`, `/partner/tools/lead-pages`, `/partner/network`, `/partner/team`, `/partner/profile` | [ ]   |
| A14  | Public pages and auth: `/`, `/login`, `/admin/login`, `/income-calculator`, `/status/[token]`, `/terms`, `/privacy`, `/refunds`            | [ ]   |

The frontend demo foundation/public/auth/admin/partner work is present in commits `2574baa`, `ddfd618`, `b3f5573`, `99402f7`, and `840a29c`; this establishes code presence, not current acceptance. The route audit is in `docs/FRONTEND_PLAN.md` and identified missing routes/aliases. Reconcile A-task completion only with route-specific checks; no frontend task is ticked from aggregate evidence alone.

## Phase B — backend, one feature per task

| Task | Scope; API; collections; required tests; screens switched to API                                                                                                                                                                                                                                           | Done when (from milestone acceptance)                                                                                                                                                                 | State                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| B1   | Login and roles. Auth/users/roles/audit endpoints in `docs/API.md`; users, roles, sessions, audit/outbox. Auth/session, TOTP, permission, audit, lockout and isolation tests. Switch login, admin users/roles/audit, partner profile/auth.                                                                 | Bootstrap admin must enroll 2FA; lockout and reset work; every route permissioned; lower role gets 403; admin changes audited before/after. Gate A.                                                   | [x] code present; Gate A owner-accepted; staging deferred          |
| B2   | Partners and applications. Public applications, admin review, partners/tree/invite, files endpoints; applications, territories, partners, partner_users, KYC docs. Upload signature/size, workflow, permission and subtree tests. Switch apply/review/partner management/profile/network.                  | Applicant verifies, reviewer approves, hierarchy is correct, cross-partner reads denied, suspended partner is blocked, end-to-end reaches pending payment.                                            | [x] implemented subset; invite quotas/reminders/2FA reset deferred |
| B3   | Plans and billing. Plans/quotes/invoices/payments endpoints; plans, invoices, payments, number_sequences; test quote bands, GST, duplicate references, activation idempotency and parallel gapless numbering. Switch plans and billing screens.                                                            | Parallel invoice issuing is gapless; correct tax; duplicate reference rejected; activation exactly once; band enforced; full apply-to-login purchase flow.                                            | [ ] M3-01 code committed `fa8ef0b`; Mongo acceptance pending       |
| B4   | Wallet and ledger. Wallet/top-up/adjustment endpoints; wallets, ledger_entries in `crm_immutable`, topups. Transaction, 100-parallel debit, idempotency, immutability, double approval and reconciliation tests. Switch wallet/admin ledger/top-up.                                                        | No overdrafts; idempotency returns first result; DB rejects ledger mutation; top-up posts once; statement matches ledger; reconciliation detects corruption. Gate B; owner reviews every ledger line. | [ ]                                                                |
| B5   | Services and forms. Services/forms/category endpoints; categories, services, form_versions. Shared schema/render/validator, permission and visibility tests. Switch catalogue and dynamic order forms.                                                                                                     | Every release service configured; owner-dependent prices block ordering; catalogue is idempotent; six category tests pass.                                                                            | [ ]                                                                |
| B6   | Orders. Orders/status-link endpoints; customers, orders, embedded snapshots, order_events, holds and documents. Test every transition, permissions, isolation, hold/release/conversion, SLA pause and link leakage. Switch partner/admin orders and customer status.                                       | All state transitions pass; low balance blocked; holds settle once; published form versions remain stable; partner isolation and status-link privacy hold. Gate C.                                    | [ ]                                                                |
| B7   | Customers and leads. Customer/lead/reminder endpoints; customers, leads, activities, reminders. Import row errors, duplicate conversion, due-once reminders and staff scope tests. Switch partner customers/leads.                                                                                         | 5,000-row import reports row errors; funnel counts match DB; reminders fire once; conversion is idempotent; restricted staff blocked.                                                                 | [ ]                                                                |
| B8   | Commissions and payouts. Commission/statement/rule/payout endpoints; rules, commissions, payout requests/batches and ledger. 20+ resolution cases, completion/refund transaction, balance bound and double-pay tests. Switch commission/payout screens.                                                    | Expected credits/reversals; payout bounded and cannot double-pay; partner sees allowed own/downline data. Owner reviews commission code line by line.                                                 | [ ]                                                                |
| B9   | Support, reports and content. Tickets/notifications/reports/content/settings endpoints; tickets, messages, notifications, lessons, progress, settings. Permission/isolation, report reconciliation, notification and seeded performance tests. Switch support/report/content/learning and real dashboards. | Ticket notifications work; report totals reconcile; 50,000-order dashboards under two seconds; content targets publish. Gate D.                                                                       | [ ]                                                                |
| B10  | Partner tools and release features. Tools/team/settings/public endpoints; invoices, lead_pages, leads, team, settings. GST/numbering, public rate limits/honeypot, team permission subset, legal/public content tests. Switch invoice/lead-page/team/income calculator/public pages.                       | Go-live checklist in SPEC §14 passes.                                                                                                                                                                 | [ ]                                                                |

## Phase C — release readiness

| Task | Required outcome                                                                                                                 | State |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ----- |
| C1   | Security hardening: rate limits, headers, uploads/scanning hook, dependency audit, OWASP tests and independent penetration test. | [ ]   |
| C2   | Performance: indexes, load tests and roadmap performance targets.                                                                | [ ]   |
| C3   | Encrypted backups, restore scripts and recorded restore drill.                                                                   | [ ]   |
| C4   | Owner staging UAT of at least 20 cases; disposition every finding; seed production plans/services/settings.                      | [ ]   |
| C5   | Production compose, domain/HTTPS, smoke test and cut-over; all deferred Atlas checks complete.                                   | [ ]   |

## Progress checklist

| New task | Status / evidence                                                                        |
| -------- | ---------------------------------------------------------------------------------------- |
| A1–A14   | [ ] Frontend task acceptance not reverified per route; earlier code commits listed above |
| B1       | [x] code; owner accepted Gate A; commit `15a6987`; staging deferred                      |
| B2       | [x] implemented subset; commits `a6c7a35`, `f1aff40`; deferred items above               |
| B3       | [ ] M3-01 only, `fa8ef0b`; DB integration skipped                                        |
| B4–B10   | [ ] Not started                                                                          |
| C1–C5    | [ ] Not started                                                                          |

## Archive: old IDs to new numbering

| Old task | New task/status                                                      |
| -------- | -------------------------------------------------------------------- |
| M0-01    | done (`433e3f3`)                                                     |
| M0-02    | done (`433e3f3`)                                                     |
| M0-03    | done (`433e3f3`)                                                     |
| M0-04    | done (`433e3f3`)                                                     |
| M0-05    | done (`433e3f3`)                                                     |
| M0-06    | done (`433e3f3`)                                                     |
| M0-07    | done (`433e3f3`)                                                     |
| M0-08    | done (`433e3f3`)                                                     |
| M1-01    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-02    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-03    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-04    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-05    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-06    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-07    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-08    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-09    | B1; code present, Gate A owner-accepted; staging deferred            |
| M1-10    | B1; code present, Gate A owner-accepted; staging deferred            |
| M2-01    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-02    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-03    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-04    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-05    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-06    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-07    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-08    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M2-09    | B2; implemented subset (`a6c7a35`, `f1aff40`), deferred items remain |
| M3-01    | B3, partially implemented (`fa8ef0b`); Mongo acceptance pending      |
| M3-02    | B3; not started                                                      |
| M3-03    | B3; not started                                                      |
| M3-04    | B3; not started                                                      |
| M3-05    | B3; not started                                                      |
| M3-06    | B3; not started                                                      |
| M3-07    | B3; not started                                                      |
| M3-08    | B3; not started                                                      |
| M4-01    | B4; not started                                                      |
| M4-02    | B4; not started                                                      |
| M4-03    | B4; not started                                                      |
| M4-04    | B4; not started                                                      |
| M4-05    | B4; not started                                                      |
| M4-06    | B4; not started                                                      |
| M4-07    | B4; not started                                                      |
| M4-08    | B4; not started                                                      |
| M4-09    | B4; not started                                                      |
| M5-01    | B5                                                                   |
| M5-02    | B5                                                                   |
| M5-03    | B5                                                                   |
| M5-04    | B5                                                                   |
| M5-05    | B6                                                                   |
| M5-06    | B6                                                                   |
| M5-07    | B6                                                                   |
| M5-08    | B6                                                                   |
| M5-09    | B6                                                                   |
| M5-10    | B6                                                                   |
| M5-11    | B6                                                                   |
| M5-12    | B6                                                                   |
| M5-13    | B6                                                                   |
| M6-01    | B5; not started                                                      |
| M6-02    | B5; not started                                                      |
| M6-03    | B5; not started                                                      |
| M6-04    | B5; not started                                                      |
| M6-05    | B5; not started                                                      |
| M6-06    | B5; not started                                                      |
| M6-07    | B5; not started                                                      |
| M6-08    | B5; not started                                                      |
| M7-01    | B7; not started                                                      |
| M7-02    | B7; not started                                                      |
| M7-03    | B7; not started                                                      |
| M7-04    | B7; not started                                                      |
| M7-05    | B7; not started                                                      |
| M7-06    | B7; not started                                                      |
| M7-07    | B7; not started                                                      |
| M7-08    | B7; not started                                                      |
| M8-01    | B8; not started                                                      |
| M8-02    | B8; not started                                                      |
| M8-03    | B8; not started                                                      |
| M8-04    | B8; not started                                                      |
| M8-05    | B8; not started                                                      |
| M8-06    | B8; not started                                                      |
| M8-07    | B8; not started                                                      |
| M8-08    | B8; not started                                                      |
| M8-09    | B8; not started                                                      |
| M9-01    | B9; not started                                                      |
| M9-02    | B9; not started                                                      |
| M9-03    | B9; not started                                                      |
| M9-04    | B9; not started                                                      |
| M9-05    | B9; not started                                                      |
| M9-06    | B9; not started                                                      |
| M10-01   | B10                                                                  |
| M10-02   | B10                                                                  |
| M10-03   | B10                                                                  |
| M10-04   | B10                                                                  |
| M10-05   | B10                                                                  |
| M10-06   | C1-C5                                                                |
| M10-07   | C1-C5                                                                |
| M10-08   | C1-C5                                                                |
| M10-09   | C1-C5                                                                |
| M10-10   | C1-C5                                                                |
| M10-11   | C1-C5                                                                |
| M10-12   | C1-C5                                                                |
| D-01     | done (`9a1a91f`)                                                     |
| D-02     | A7/A12/A13 frontend demo code (`840a29c`); acceptance pending        |
| R-01     | done (`ef7022e`)                                                     |
| R-02     | done (`dc54ad0`)                                                     |
| S-01     | done (`4daefe7`)                                                     |
| F-01     | done (`10d3926`)                                                     |
