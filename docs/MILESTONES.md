# Milestones and acceptance criteria

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.

## Source page 27

10. Delivery roadmap
    Eleven milestones, built strictly in order because each depends on the one before. Weeks
    are planning figures for one to two engineers reviewing Codex's output; M7 and M9 can
    overlap if a second engineer is available, which brings the total toward 28 weeks.
    delivery roadmap · 11 milestones in 5 phases
    Milestone Weeks Size Depends
    on
    What works at the end
    M0 Foundation 1 to 2 S none docker compose up starts all
    seven containers; CI passes; repo
    docs in place
    M1 Identity and access 3 to 4 M M0 Admin and partner login, 2FA, roles
    and permissions, audit log
    M2 Partners and KYC 5 to 7 M M1 Public application, KYC review,
    partner hierarchy, activation
    M3 Plans and billing 8 to 10 M M2 Plans, quotes, plan invoices as PDF,
    manual payment recording
    M4 Wallet and ledger 11 to 13 L M3 Top-up requests, approval,
    append-only ledger, statements
    M5 Catalogue and
    orders
    14 to 17 L M4 Services and forms, order lifecycle,
    documents, queries, customer
    status page

## Source page 28

Size guide: S is under a week of focused work, M is two to three weeks, L is three to four
weeks.
Effect of MongoDB: the transaction, validation and integrity safeguards add about one
week to M4 and one to M9, so plan for about 34 weeks in total. The week columns here
and in section 12 show the base plan; add one week from M4 onward and one more from
M9 onward.
Gates. At the end of M1, M4, M6 and M9 the owner reviews a live demo in staging and
signs off before Codex starts the next milestone. M10 ends with the go-live checklist in
section 14. 11. Milestone task lists
Each task is small enough for one Codex session and one pull request. Tick a task here
only after its tests pass in staging. "Done when" lines are the acceptance tests; Codex
must turn each into an automated test where it can.
M0 Foundation (weeks 1 to 2)
Goal: an empty but fully running system, with every rule and doc in place so later work
stays consistent.
Milestone Weeks Size Depends
on
What works at the end
M6 Service setup 18 to 19 M M5 All release-1 services configured
with forms, documents, prices and
checklists
M7 CRM and leads 20 to
22
M M5 Customers, leads pipeline,
reminders, import
M8 Commissions and
payouts
23 to
25
L M5, M4 Rule engine, upline override,
statements, payout batches
M9 Support, reports,
content
26 to
28
M M5 Tickets, dashboards, CSV reports,
learning and marketing kit,
notifications
M10 Partner tools and
release
29 to
32
L all Invoice builder, lead pages, income
calculator, team management,
hardening, UAT, go-live

## Source page 29

Done when: a fresh clone with cp .env.example .env && make up shows seven healthy
containers; / renders; /partner and /admin redirect to their login placeholders;
/api/health answers through the proxy; CI is green; Money tests pass.
M1 Identity and access (weeks 3 to 4)
Goal: secure login for admins and partners, roles, permissions, audit.
M0-01 Create the repo layout from section 7, pnpm workspace, Turborepo, strict
TypeScript, ESLint, Prettier, commit hooks. Create AGENTS.md and the docs/ files
from this document.
M0-02 Dockerfiles (multi-stage) for web and api; docker-compose.yml with the
seven containers, health checks and volumes; Caddyfile; dev override with mailpit and
adminer.
M0-03 API skeleton: config validated by Zod from env, /api/health , structured
logging with request id, global error filter using the standard error shape.
M0-04 Web skeleton: Next.js route groups for public, partner and admin; three
layouts with navigation placeholders; translation files; typed API client.
M0-05 Prisma setup, first migration, make migrate , seed script skeleton, make seed .
M0-06 packages/shared : permission keys, status enums, Money helper (integer
paise, GST split, rounding rules) with exhaustive unit tests.
M0-07 CI: install, lint, typecheck, unit tests, build images, start compose, smoke test
through the proxy.
M0-08 Test harness: Supertest with a throwaway database, Playwright config, data
factories.
M1-01 Models from 8.1 and migration; database trigger blocking update and delete on
audit_log .
M1-02 Argon2 login for partners and admins on separate endpoints and cookie names;
Redis sessions with different lifetimes; logout; CSRF; lockout after repeated failures
(count and minutes are settings).
M1-03 TOTP setup and verify, ten hashed recovery codes; mandatory for admin roles.
M1-04 Email service: outbox table, worker with retries, templates, password reset by
emailed token.
M1-05 Seed roles and permission keys; @RequirePermission decorator and guard; a
test that fails if any route lacks a permission.
M1-06 Actor object and scopeToActor helper with unit tests (partner path scoping
stubbed until M2).
M1-07 Audit interceptor recording who, what, before and after; GET /admin/audit
with filters.

## Source page 30

Done when: the bootstrap admin is created from env on first start and must enrol 2FA
before seeing anything; five bad passwords lock the account; password reset works end
to end in mailpit; every route has a permission; a lower role receives 403; each admin
change appears in the audit log with before and after values.
M2 Partners and KYC (weeks 5 to 7)
Goal: a person can apply, be verified and become a partner in the hierarchy.
Done when: an applicant applies and verifies email; a reviewer approves; the partner has a
correct path and parent; a partner cannot read any record outside their own downline; a
suspended partner cannot create orders or request top-ups; the end-to-end test reaches
pending_payment .
M3 Plans and billing (weeks 8 to 10)
Goal: sell a plan, invoice it, record payment, activate the partner.
M1-08 Admin UI: login, 2FA enrollment, users list and edit, role assignment, audit log
page.
M1-09 Partner UI: login, forgot and reset password, profile with password change and
2FA, navigation by role.
M1-10 Row-level security framework and a test that proves it blocks cross-partner
reads.
M2-01 Models from 8.2, migration, seed of sample territories.
M2-02 Public apply page and API: validation, document upload by presigned URL,
email verification link, territory availability check.
M2-03 Admin applications queue and detail with document viewer; approve, reject
with reason, request more information; emails for each.
M2-04 On approval create the partner: readable code, parent assignment rules by
tier, materialised path, tree query helper.
M2-05 Invite flow: master distributors and distributors invite a lower partner, limited
by seat quota.
M2-06 Partner profile and KYC document management, with expiry reminders by the
worker.
M2-07 Admin partners list, detail and tree view; suspend and reactivate; reset a
partner's 2FA.
M2-08 Field encryption service for PAN and bank details; masked display; tests that
raw database values are unreadable.
M2-09 Partner network page with downline tree and counts.

## Source page 31

Done when: parallel invoice issuing produces gapless numbers; tax split is correct for
same-state and other-state partners; a second payment on the same reference is
rejected; activation runs exactly once; a price outside the band is rejected; the end-to-
end test goes apply, approve, invoice, payment, first login.
M4 Wallet and ledger (weeks 11 to 13)
Goal: partners hold a balance that can only change through an append-only ledger. This is
the most safety-critical code in the product: review every line.
M3-01 Models from 8.3; invoice number service with April to March financial year and
a concurrency test proving no gaps or duplicates.
M3-02 Admin plans CRUD and public plans page; seed three placeholder plans
(retailer, distributor, master distributor) with editable price bands and ID quotas.
M3-03 Quote: admin sets the price for an applicant; rejected if outside the plan's
band.
M3-04 Invoice service: draft, issue, PDF with company details from settings, CGST
and SGST or IGST by state, amount in words; credit notes.
M3-05 Manual payment recording by finance , with proof upload; invoice becomes
paid ; idempotent.
M3-06 Activation job: on a paid plan invoice create seats, create the empty wallet,
activate the partner, send welcome email and login invite, exactly once.
M3-07 Partner billing page: invoices list and PDF download.
M3-08 Admin invoices list, void a draft, issue a credit note.
M4-01 Models from 8.4; triggers blocking update and delete on ledger_entries ;
LedgerService.post() that locks the wallet row, assigns gapless seq , computes
balance_after , and honours idempotency_key .
M4-02 Hold, release and convert-hold primitives; available balance is balance minus
held.
M4-03 Partner top-up request: API and UI with amount, date, reference and proof
upload; unique reference.
M4-04 Admin top-up queue with proof beside the form; approve posts one credit in
the same transaction; reject needs a reason; notifications for both.
M4-05 Admin adjustments (credit or debit) with mandatory reason, dedicated
permission and audit.
M4-06 Partner wallet page: balance, held, available, statement with filters, CSV and
PDF export.
M4-07 Admin ledger explorer and wallet-float summary.

## Source page 32

Done when: a concurrency test with 100 parallel debits never overdraws; repeating an
idempotency key returns the first result; the database refuses any update or delete on
the ledger; approving the same top-up twice posts once; statement totals equal ledger
sums; the reconciliation job detects a deliberately corrupted cached balance.
M5 Catalogue and orders (weeks 14 to 17)
Goal: a partner can place an order for any configured service and watch it move to
completion.
M4-08 Nightly reconciliation job: cached balance equals sum of entries; mismatch
raises an admin notification.
M4-09 Low-balance in-app alert with threshold per partner.
M5-01 Models from 8.5 and 8.6; migrations.
M5-02 Admin categories and services CRUD with price, GST rate, turnaround time
and plan visibility.
M5-03 Form builder: sections, field types (text, number, date, select, multi-select,
checkbox, textarea, address, file, repeatable group), validation (required, min, max,
pattern), conditional visibility, versioning and publish; admin UI with live preview.
M5-04 One form renderer in the web and one validator in the API, both reading the
same schema from packages/shared , with tests.
M5-05 Customers CRUD with duplicate warning on mobile or GSTIN within a partner.
M5-06 New-order wizard: service, customer, form, documents, price summary; draft
autosave.
M5-07 Submit: validate, check available balance, place hold, generate order number,
write events; refuse with WALLET_INSUFFICIENT when short.
M5-08 Admin order queue with filters, manual and round-robin assignment, SLA due
time with pause while a query is open.
M5-09 Processing actions: start, raise query (reason and due date), partner answer
with documents, complete (output documents required), reject, cancel, with the
ledger effects from section 5.3.
M5-10 Order detail pages for partner and admin: timeline, documents, queries;
uploads and downloads through short-lived, permission-checked URLs.
M5-11 Customer status link: generate, revoke, expiring token stored as a hash; public
page shows only that order's timeline and any outputs the partner chose to share.
M5-12 Invoice per completed order using the M3 service; refund action with credit
note and ledger reversal.
M5-13 In-app and email notifications for every order event, from editable templates.

## Source page 33

Done when: every transition in section 5.3 has a passing test; submitting with a low
balance is blocked; hold is released on reject and cancel and converted exactly once on
completion; the SLA clock pauses during a query; changing a published form creates a
new version and leaves old orders untouched; partners cannot open another partner's
order or file; the status page leaks nothing beyond its own order.
M6 Service setup (weeks 18 to 19)
Goal: every release-1 service is orderable, using configuration only. Services that need
outside approvals (PAN, DSC and the rest of section 13) are created inactive and labelled
coming soon.
Done when: every service in section 1.2 exists with a form, documents, price and
turnaround; services awaiting owner input are blocked and listed; the catalogue import
can be re-run without duplicates; all six category tests pass.
M7 CRM and leads (weeks 20 to 22)
Goal: partners manage customers and prospects in one place and never miss a due date.
M6-01 Catalogue import: services defined in ops/catalogue/*.yaml (category,
service, form schema, documents, price, GST rate, turnaround); idempotent make
catalogue .
M6-02 GST group: registration, amendment or migration, monthly and quarterly
returns, annual return, bookkeeping, reconciliation, cancellation, notice reply.
M6-03 Income tax group: ITR for salaried, business, professional and firm cases.
M6-04 Registrations group: Udyam, FSSAI, Shop and Establishment, IEC, trademark,
LLP, OPC, Nidhi, private limited, partnership.
M6-05 Accounting group: monthly and yearly packages.
M6-06 Web and design group: one-page site, multi-page site, e-commerce site, logo,
brochure, SEO, social pages, ads set-up, SSL, each with a deliverables checklist.
M6-07 Owner review flag: any service whose price, turnaround or document list is a
placeholder is marked needs_review and cannot be ordered; admin report lists them.
M6-08 End-to-end test: one order per category from creation to completion.
M7-01 Models for leads, activities, reminders from 8.7; migrations.
M7-02 Customer detail page: service history, notes, several businesses or GSTINs per
customer; CSV import with preview and a row-level error report; CSV export.
M7-03 Leads: manual create, pipeline board with stage changes, list filters, activities,
next follow-up date, owner chosen from the partner's staff.
M7-04 Convert lead to customer, optionally starting a draft order; no duplicates.

## Source page 34

Done when: a 5,000-row customer import completes and reports errors by row; funnel
counts equal database counts; each reminder fires once at its due time; converting a lead
twice creates one customer; restricted staff are blocked as designed.
M8 Commissions and payouts (weeks 23 to 25)
Goal: commission is calculated by rules, credited on completion, reversed on refund and
paid out in batches.
Done when: all rule-resolution cases pass; completing an order creates exactly the
expected entries and ledger credits; a refund reverses them; a payout can never exceed
the available commission balance; a batch cannot be paid twice; a partner sees only their
own commission and, where allowed, downline overrides.
M7-05 Reminders: per-customer due dates (including return due dates from service
templates), calendar view; worker sends in-app and email reminders on the due date.
M7-06 Recurring services: after completing a recurring service, offer to create the
next reminder or draft order.
M7-07 Dashboard widgets: leads funnel and due this week.
M7-08 Permission tests for partner staff: restricted staff cannot see leads or
customers they are not allowed to see.
M8-01 Models from 8.8; migrations.
M8-02 Rule admin UI and API (flat or percent, scope, priority, validity dates) with a
preview tool: choose service, plan and tier to see the commission at each level.
M8-03 Rule resolution function (most specific wins, newest breaks ties) with table-
driven tests covering at least 20 cases.
M8-04 Commission engine run inside the order-completion transaction: creates
entries for the partner and each upline level, posts ledger credits; reversal on refund.
M8-05 Partner commission pages: per-order list, monthly statement PDF, downline
override view for distributors and above.
M8-06 Payout request by the partner: minimum from settings; requires 2FA, bank
details and PAN on file.
M8-07 Admin payout batch builder: pick requests, compute TDS from settings, export
bank-transfer CSV, mark paid with bank reference, post ledger payout entries, notify.
M8-08 Settings for minimum payout and TDS percent and threshold, with a note that
the owner's accountant decides the values.
M8-09 Annual commission summary export per partner.

## Source page 35

M9 Support, reports and content (weeks 26 to 28)
Goal: run the business day to day: help partners, see the numbers, train partners.
Done when: the ticket flow works with notifications; every report total equals the ledger
or order data in a seeded test set; dashboards load in under two seconds on a seeded set
of 50,000 orders; content can be published to chosen audiences.
M10 Partner tools and release (weeks 29 to 32)
Goal: finish the tools, harden, prove recovery, and go live.
M9-01 Tickets: partner creates with category, optional order link and attachments;
admin queue with assignment, status, SLA and messages; email and in-app
notifications.
M9-02 Notification centre: bell, unread count, mark read, per-type email preferences.
M9-03 Reports with date filters, drill-down and CSV: orders_by_status ,
orders_by_service , sla_breaches , partner_performance , new_partners ,
plan_revenue , wallet_float , topups , commission_liability , payouts ,
partner_commissions , partner_orders , leads_funnel .
M9-04 Real data in the admin and partner dashboards.
M9-05 Content: admin CRUD for lessons (text, video link, files), quizzes, marketing kit
files and announcements; partner learning page with progress and a completion
certificate PDF.
M9-06 Settings pages: company and GST details, bank details used in payment
instructions, invoice prefix, email template editor with preview, SLA defaults,
thresholds.
M10-01 Public income calculator using the published commission rules, with a
settings-managed disclaimer that figures are illustrative and not a guarantee.
M10-02 Partner invoice builder: clients, lines, GST, own numbering series, PDF, history.
M10-03 Lead pages: builder (title, intro, fields), public page /p/[slug] with rate
limiting and a honeypot field; submissions create leads for that partner.
M10-04 Team management: partner creates staff with a permission subset,
deactivates them, all audited.
M10-05 Public site pages: home, plans, services and legal pages driven by settings
and content.
M10-06 Security hardening: rate limits, security headers, dependency audit, upload
type and size limits, scanning hook, OWASP checklist tests; commission an
independent penetration test (any vendor, no approval needed).

## Source page 36

Done when: the go-live checklist in section 14 passes in full. 12. Progress tracker
The owner updates the status column at each gate. Task-level progress lives in the
checklists in section 11 and in docs/PROGRESS.md in the repo, which Codex updates after
every task. 100 tasks in total.
M10-07 Performance: index review, load-test script, fix hotspots until section 14
targets are met.
M10-08 Backups: nightly encrypted backup of database and storage, restore script,
and one restore drill carried out and recorded.
M10-09 Observability: logs, metrics, uptime check, and alert emails for failed jobs and
ledger mismatches.
M10-10 Runbook and guides: deploy, rollback, rotate secrets, add an admin, common
support tasks; one admin guide and one partner guide.
M10-11 UAT: owner runs a written script of at least 20 scenarios on staging; fix or defer
every finding with a recorded decision; production seed for plans, services and
settings.
M10-12 Go-live: production compose, domain and HTTPS, smoke test, cut-over.
Milestone Tasks Planned
weeks
Status Gate
approved on
Notes
M0 Foundation 8 1 to 2 Not started
M1 Identity and
access
10 3 to 4 Not started Gate A
M2 Partners and
KYC
9 5 to 7 Not started
M3 Plans and billing 8 8 to 10 Not started
M4 Wallet and ledger 9 11 to 13 Not started Gate B; review every line of
ledger code
M5 Catalogue and
orders
13 14 to 17 Not started
M6 Service setup 8 18 to 19 Not started Gate C; first end-to-end
release; owner supplies final
prices
M7 CRM and leads 8 20 to 22 Not started
M8 Commissions
and payouts
9 23 to 25 Not started

## Source page 37

13. Phase B: integrations deferred until approvals arrive
    None of this blocks release 1. Each item is prepared by an interface and a disabled stub so
    it can be switched on later without reshaping the core. Until then, services in these
    groups are either not offered or are handled manually by staff, as shown.
    Milestone Tasks Planned
    weeks
    Status Gate
    approved on
    Notes
    M9 Support, reports,
    content
    6 26 to 28 Not started Gate D
    M10 Partner tools
    and release
    12 29 to 32 Not started Go-live checklist in section
    14
    Item Adapter interface Needs from
    outside
    Release-1
    fallback
    Rough
    build effort
    once
    approved
    Online
    payments and
    automatic top-
    up
    PaymentGateway Payment-gateway
    merchant
    account
    Manual top-
    up with proof
    2 to 3
    weeks
    SMS alerts and
    OTP
    SmsProvider Sender and
    template
    registration
    Email and in-
    app
    1 week
    WhatsApp
    messages
    WhatsappProvider Business account
    and template
    approval
    Email and in-
    app
    1 to 2
    weeks
    Automated
    GST filing, e-
    invoice, e-way
    bill
    GstApi Contract with a
    licensed API
    provider
    Staff file on
    the
    government
    portal
    4 to 5
    weeks
    PAN and digital
    signature
    certificates
    PanService ,
    DscService
    Authorised
    agency or issuing
    partner
    Not offered 2 weeks
    each
    Bill payments,
    recharges,
    FASTag
    BillPayments Aggregator or
    bill-payment unit
    agreement
    Not offered 4 to 6
    weeks

## Source page 38

13.1 Adapter rules
Each interface lives in apps/api/src/adapters/<name>.ts with method signatures,
types and error codes.
Every interface ships with a Disabled<Name> implementation that returns
NOT_ENABLED , and a FEATURE_<NAME> flag that is off.
Item Adapter interface Needs from
outside
Release-1
fallback
Rough
build effort
once
approved
AEPS, micro
ATM, money
transfer,
Aadhaar Pay
BankingServices Bank or
correspondent
partner,
hardware,
regulatory fit
Not offered 6 to 8
weeks
Insurance InsuranceLeads Insurer
partnership,
agent
registration
Not offered 3 to 4
weeks
(lead hand-
off)
Loans, cards,
DMAT, mutual
funds, bank
accounts
FinanceLeads Agreements with
lenders, issuers,
brokers
Not offered 3 to 5
weeks
Travel and
IRCTC
TravelProvider Aggregator API,
IRCTC agent
licence
Not offered 6 to 8
weeks
Government
identity,
passport,
licence and
scheme
services
GovService (one
per service)
Authorised-
agency status for
each
Not offered 1 to 2
weeks
each
Automatic
identity
checks, e-sign
KycProvider ,
ESignProvider
Provider contract Manual KYC
and uploaded
signed forms
2 to 3
weeks
Native or
mobile app
none Owner decision Responsive
portal
Reuses the
same API
