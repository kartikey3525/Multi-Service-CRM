# Product specification

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.
>
> **Project override:** MongoDB is the primary database; Redis is only for supporting sessions and queues. This user decision overrides the source PDF's PostgreSQL/Prisma line. The selected stack is recorded in `DECISIONS.md`.

## Source page 1

Multi-Service Franchise CRM: Product &
Engineering Roadmap
Nov 23, 2026 · @kartikey

1. Scope and locked decisions
   Release 1 is a single web portal, run entirely in containers, that lets a head office sell
   partner plans and lets partners serve customers across tax, registration and business
   services. Nothing in release 1 waits on an outside approval, licence or provider contract.
   Services that need those are designed now as disabled adapters and switched on later
   (section 13).
   The model is based on a public franchise-style service network, but we build our own
   product: our own name, logo, text and plan names, and no use of the reference's
   trademark.
   1.1 Decisions (treat as fixed unless the owner changes them)
   ID Decision Consequence for the build
   D1 One responsive web portal. No native or
   mobile apps, no app-store work.
   One Next.js app with three areas: public
   site, partner portal, admin portal. Mobile
   browsers must work well.
   D2 Admin and partner users get separate
   interfaces inside the portal.
   Separate route groups, layouts,
   navigation and login entry points; admin
   uses its own session cookie and
   mandatory 2FA.
   D3 Everything runs in Docker containers. Docker Compose for local, staging and
   production on one host; no cloud-
   specific services required.
   D4 Manual-first operations. Admin verifies KYC, approves wallet top-
   ups, marks payouts paid, and staff fulfil
   services by hand.
   D5 Login with email and password plus
   authenticator-app 2FA (TOTP). No SMS
   OTP.
   No DLT or SMS gateway dependency.
   Email codes for password reset.
   D6 Notifications are in-app plus email
   through any SMTP server.
   No WhatsApp or SMS dependency.

## Source page 2

1.2 In scope for release 1
Public site with partner application form and plan information.
Admin portal: users, staff roles, partners, KYC review, plans, services and forms,
wallet and top-up approval, orders, commissions and payouts, tickets, reports,
settings, audit log.
Partner portal: dashboard, wallet, orders, customers, leads, commissions, team,
support, learning, tools, profile.
Customer status page reached by a secure link (no customer account).
Services fulfilled manually by your staff and tracked in the portal: GST registration,
migration, return filing, bookkeeping; income tax returns; Udyam, FSSAI, Shop and
Establishment, IEC, trademark, LLP, OPC, Nidhi and private limited registrations;
accounting packages; website, logo, brochure and social-page services.
Partner tools: GST invoice builder, lead-capture pages, income calculator, learning
module, marketing kit, team management.
1.3 Out of scope for release 1 (Phase B, section 13)
Online payment gateway, SMS and WhatsApp, automated GST filing and e-way bills, PAN
and DSC issuing, bill payments and recharges, AEPS, micro ATM and money transfer,
insurance, loans, cards, investments, travel and IRCTC, government identity and licence
services, automatic identity verification and e-sign, and any native app.
ID Decision Consequence for the build
D7 Money is stored as integer paise in an
append-only ledger.
No floats for money anywhere.
D8 TypeScript everywhere: Next.js, NestJS,
PostgreSQL, Redis, Prisma.
One language so Codex keeps context
across the stack.
D9 Files go to S3-compatible storage (MinIO
container).
Can move to a cloud bucket by changing
environment variables.
D10 Single company (one tenant); INR; times
stored in UTC and shown in Asia/Kolkata.
English UI with all text in translation files
so Hindi can be added.
No multi-tenant code in release 1.

## Source page 3

2. Working agreement for Codex
   This document is the source of truth. Codex does not read it live; it reads files in the
   repository. So the first task is to copy the right parts of this document into the repo, and
   from then on keep them in step with the code.
   2.1 Context files to create in the repo (task M0-01)
   Each module folder also gets a short README.md : purpose, public functions, invariants
   that must never break, and the tests that protect them.
   2.2 The task loop (Codex repeats this for every task)
1. Open docs/PROGRESS.md and take the first unchecked task in order. Never skip
   ahead across a milestone gate.
1. Read the task's spec, the module README, and the data model and API entries it
   names.
1. Write the tests first (unit, API, and a permission test for each endpoint).
1. Implement the smallest change that passes. Follow the conventions in section 7.
1. Run the full check: lint, typecheck, unit tests, API tests, build, and the container
   smoke test.
   File Contents Source here
   AGENTS.md Short rules and commands Codex must
   always follow (draft in the appendix)
   Appendix
   docs/SPEC.md Scope, decisions, roles, portal map, business
   flows
   Sections 1 to 5
   docs/ARCHITECTURE.md Containers, stack, repo layout, conventions Sections 6 and 7
   docs/DATA_MODEL.md Tables and columns Section 8
   docs/API.md API conventions and endpoints Section 9
   docs/MILESTONES.md Milestones, task IDs, acceptance criteria Sections 10 and
   11
   docs/PROGRESS.md Live task status, updated by Codex on every
   task
   Section 12
   docs/DECISIONS.md One line per decision or new dependency,
   with date and reason
   Starts empty
   docs/QUESTIONS.md Open questions for the owner Starts empty

## Source page 4

6. Update docs and docs/PROGRESS.md ; tick the task.
7. Commit with the task ID in the message (for example M4-03: ledger posting
   service ). One task per commit or pull request.
8. At the last task of a milestone, stop, write a gate summary (what was built, how to
   demo it, known gaps) and wait for owner review.
   2.3 Rules Codex must not break
   Do not invent requirements. If the spec is silent, choose the documented default, add
   a line to docs/QUESTIONS.md , and continue.
   Money: integer paise only; all balance changes go through the ledger service; every
   ledger function has tests for double posting, rollback and concurrency.
   Access control: every endpoint declares a permission; every query is scoped by the
   caller's partner hierarchy; every endpoint has a test that proves a lower role gets 403
   and another partner's data is invisible.
   Migrations are forward-only and reviewed; never edit an applied migration.
   Dependencies: add one only when needed, and record it in docs/DECISIONS.md .
   Secrets live only in environment variables; .env.example lists every variable with a
   safe dummy value.
   No unfinished work left half-wired: a feature either works end to end behind its
   permission, or is not merged.
   2.4 Managing progress
   Codex updates docs/PROGRESS.md on every task.
   The owner reviews at each milestone gate and then updates the status in section 12 of
   this document.
   A milestone is done only when every task is ticked, every acceptance criterion passes
   in the staging containers, and the gate summary is approved.
9. Roles and permissions
   Permissions are named resource.action (for example partners.approve ). Roles are
   just bundles of permissions stored in the database, so an admin can adjust them without a
   code change. Data is also scoped: a partner sees only their own records and their
   downline's, never anyone else's.

## Source page 5

3.1 Roles
3.2 Permission matrix
Y = allowed, own = own records only, down = own plus downline, sub = depends on admin
sub-role, blank = not allowed.
Role Who Scope of data
super_admin Owner Everything, including
settings, roles and audit log
admin_staff Your employees, with one or more
sub-roles: kyc_reviewer ,
finance , processor (fulfils
orders), support ,
content_manager , sales
Everything allowed by their
sub-roles
master_distributor Top partner Own records plus the whole
downline
distributor Mid partner Own records plus the
downline of retailers
retailer Franchise centre Own records only
partner_staff Employee of a partner, created by
that partner
Subset of the partner's
records, chosen by the
partner
Customer End client No login; sees one order
through a secure, expiring
status link
Capability Super
admin
Admin
staff
Master
dist.
Distributor Retailer Partner
staff
Manage admin users and roles Y
System settings, invoice
numbering
Y
View audit log Y sub
Review and approve applications
(KYC)
Y sub
Create and edit plans, services,
forms
Y sub

## Source page 6

3.3 Security rules tied to roles
Admin roles require TOTP 2FA; partner roles may enable it, and it becomes mandatory
before a first payout request.
Sessions use secure, HTTP-only cookies; admin sessions expire sooner than partner
sessions.
Every create, update, approve and delete by an admin or partner is written to the
audit log with who, when, before and after. 4. Portal map
One web application, three areas. Every page below is a deliverable and is referenced by
task IDs in section 11. Layouts are responsive: tables collapse to cards on small screens.
Capability Super
admin
Admin
staff
Master
dist.
Distributor Retailer Partner
staff
View partners Y Y down down own own
Create or invite a lower partner Y sub Y Y
Approve wallet top-ups, post
adjustments
Y sub
Request wallet top-up, view wallet down down own own
Create orders Y sub Y Y Y Y
Process orders, change status,
upload outputs
Y sub
View orders Y Y down down own own
Customers and leads Y sub down down own own
Configure commission rules Y sub
View commissions Y sub down down own
Run and mark payouts Y sub
Tickets Y sub down down own own
Reports Y sub down down own
Manage partner staff Y Y Y
Learning and marketing content
(edit)
Y sub

## Source page 7

4.1 Public site ( / )
4.2 Partner portal ( /partner )
Route Page Purpose
/ Home What we offer, plans, call to action
/plans Plans Retailer, distributor and master-distributor
tiers with price bands
/services Services Catalogue grouped by category
/apply Apply Partner application form with document
upload
/income-calculator Calculator Illustrative commission estimate, clearly
labelled as an estimate
/login , /admin/login Sign in Partner login and a separate admin login
/status/[token] Order
status
Customer view of one order; no account
/terms , /privacy ,
/refunds
Legal Text provided by the owner
Route Page Purpose
/partner Dashboard Wallet balance, orders by status,
commission this month, due
reminders, announcements
/partner/wallet Wallet Balance, top-up request with
payment proof, statement, export
/partner/orders/new New order Pick service, pick or add customer,
fill form, upload documents,
confirm fee
/partner/orders ,
/partner/orders/[id]
Orders List with filters; detail with
timeline, documents, queries,
messages
/partner/customers Customers Customer list and detail with
service history and reminders

## Source page 8

4.3 Admin portal ( /admin )
Route Page Purpose
/partner/leads Leads Pipeline board and list, follow-ups,
convert to customer
/partner/commissions Commissions Per-order commission, statements,
payout history
/partner/network Network Downline tree and performance
(distributors and above)
/partner/team Team Add staff, set what each can see
/partner/support Support Raise and track tickets
/partner/learn Learning and
kit
Training lessons, quizzes,
marketing downloads
/partner/tools/invoice Invoice builder Create GST invoices for the
partner's own clients
/partner/tools/lead-pages Lead pages Public lead-capture forms that feed
the partner's leads
/partner/profile Profile Business details, KYC documents,
bank details, 2FA, password
Route Page Purpose
/admin Dashboard Applications waiting, top-ups waiting,
orders by status, SLA breaches, wallet float
/admin/applications Applications KYC review queue: view documents,
approve, reject with reason, request more
/admin/partners Partners Search, detail, tree view, plan, status,
suspend, reset 2FA
/admin/plans Plans Create and edit plans, price bands, ID
quotas
/admin/services Services Categories, services, price and cost,
required documents, turnaround time
/admin/forms Form builder Build the field list for each service without
code

## Source page 9

5. Business flows and money rules
   Route Page Purpose
   /admin/orders Orders Work queue with assignment, status
   change, queries, output upload
   /admin/wallet-
   requests
   Top-up requests Approve or reject with proof visible
   /admin/ledger Ledger Search every entry; post adjustments with
   a reason
   /admin/commissions Commission
   rules
   Rules by service, plan and tier; preview
   /admin/payouts Payouts Build a batch, export bank file, mark paid
   /admin/tickets Tickets Support queue
   /admin/reports Reports Standard reports with CSV export
   /admin/users Users and roles Staff accounts and role assignment
   /admin/content Content Learning lessons, marketing kit,
   announcements
   /admin/settings Settings Company and GST details, invoice
   numbering, email templates, SLA defaults
   /admin/audit Audit log Search by user, record, date
   order lifecycle · 7 steps, 1 decision

## Source page 10

The money path runs across the top row and back along the bottom: the wallet is debited
when the order is submitted, and the commission is credited only when the order
completes.
5.1 Partner onboarding and plan purchase

1. Visitor submits /apply (name, email, mobile, business name, city and PIN, plan,
   documents). Email address is verified by a link.
2. Application enters the admin KYC queue as submitted .
3. A kyc_reviewer checks documents and chooses approve, reject with reason, or
   request more information. Each choice emails the applicant.
4. On approval the system creates a draft invoice for the plan price (within its band) and
   emails payment instructions (bank account and UPI details from settings).
5. Applicant pays outside the system. finance records the payment (amount, date,
   reference, proof file); the invoice becomes paid .
6. System activates the partner: creates the partner account and login invite, issues the
   plan's IDs, creates the wallet, assigns the parent in the hierarchy, and sends a
   welcome email.
7. The partner sets a password, enrolls 2FA and completes the first-steps checklist.
   5.2 Manual wallet top-up
8. Partner opens Wallet, enters amount, payment date and reference, and uploads proof.
9. Request is pending . finance sees it in the queue with the proof next to it.
10. Approve: a ledger credit is posted and the partner is notified. Reject: reason is
    required and emailed.
11. A request cannot be approved twice, and the same reference number cannot be
    approved twice.
    5.3 Order status machine
    From To Who Effect
    (new) draft Partner Form saved, nothing charged
    draft submitted Partner Price checked, wallet hold
    placed; refused if balance is too
    low
    submitted assigned Admin or
    auto-rule
    A processor takes ownership;
    SLA timer starts

## Source page 11

Every transition is recorded in order_events with the actor, time and reason, and may
not be edited.
5.4 Pricing, commission and payout rules
Service price: what the partner pays us per order, stored excluding GST with a tax
rate. The partner may charge the customer any amount; that amount is recorded for
the partner's own reference and never collected by the platform.
Commission: configured as a flat amount or a percentage of the service price, per
service, per plan and per partner tier, with an optional percentage for each upline
level. The most specific rule wins; ties are broken by the newest rule.
When commission is earned: on completed , credited as a ledger entry marked
commission ; reversed on refunded .
Payouts: partner requests a withdrawal from the commission balance (minimum
amount is a setting). finance builds a batch, exports a bank-transfer file, pays
outside the system, then marks the batch paid with the bank reference.
Tax on commission: a TDS percentage and threshold are settings, off by default. The
owner's accountant decides whether and how to enable them.
From To Who Effect
assigned in_process Processor Work begins
in_process query Processor Reason and due date recorded;
partner notified; SLA paused
query in_process Partner Reply or new documents
added; SLA resumes
in_process completed Processor Output documents attached;
hold converted to a debit;
invoice issued; commission
credited; customer link
updated
submitted , assigned ,
in_process
rejected Processor Hold released; reason shown to
partner
draft , submitted cancelled Partner Hold released
completed refunded Finance Debit reversed, commission
clawed back, credit note issued
