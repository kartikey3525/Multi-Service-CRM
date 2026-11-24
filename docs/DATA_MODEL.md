# Data model

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.

## Source page 17

8. Data model
   Each row below is a Mongoose collection. Every document also has _id (ObjectId),
   createdAt and updatedAt , left out below. Money fields end in _paise and hold integer
   paise. Fields ending in _enc are encrypted with FIELD_ENCRYPTION_KEY . A reference to
   another collection is an ObjectId field; "jsonb" in the listings means a nested object.
   Codex writes camelCase field names in code (for example balancePaise ) and turns this
   section into Mongoose models and migrate-mongo scripts in the milestone named in
   each heading.
   Embedded, not separate: invoice_lines live inside invoices.lines ;
   role_permissions inside roles.permissions ; user_roles is users.roleIds ;
   service_documents inside services.documents ; payout_items inside
   Topic Rule
   Errors One error shape: { code, message, details?,
   requestId } ; codes are stable strings such as
   WALLET_INSUFFICIENT
   Pagination ?page , ?pageSize (max 100), ?sort , ?q ;
   response { items, page, pageSize, total }
   Idempotency Every money-changing POST accepts an
   Idempotency-Key header; repeating it returns the
   first result
   Transactions Any operation that changes more than one
   document, and every money operation, runs inside
   session.withTransaction() on the replica set
   References MongoDB does not enforce foreign keys, so
   services check that referenced documents exist; a
   nightly job reports orphans
   Soft delete Business records are never hard-deleted; use
   status ; only drafts may be removed
   Logging Structured JSON, request id on every line, no
   personal data in logs
   Text No hard-coded user-facing strings in components;
   use messages/en.json
   Git Short branches, one task per pull request, message
   starts with the task ID, CI must be green

## Source page 18

payout_batches.items ; order_queries inside orders.queries . Always separate
because they grow without limit: ledger_entries , audit_log , order_events ,
ticket_messages , lead_activities .
8.1 Identity and audit (M1)
8.2 Partners and KYC (M2)
Table Key columns Rules
users email (unique), password_hash,
name, mobile, kind ( admin or
partner ), status,
totp_secret_enc, totp_enabled,
failed_logins, locked_until,
last_login_at
Lock after repeated failures; admin
and partner users are separate
kinds with separate login
endpoints
roles key, name, kind Seeded: super_admin ,
kyc_reviewer , finance ,
processor , support ,
content_manager , sales ,
master_distributor ,
distributor , retailer ,
partner_staff
role_permissions role_id, permission_key Permission keys come from
packages/shared
user_roles user_id, role_id A user may hold several admin
sub-roles
audit_log actor_user_id, action, entity,
entity_id, before (jsonb), after
(jsonb), ip, user_agent
Append-only; a database trigger
blocks update and delete

## M1 implementation additions (MongoDB)

`users` stores password hashes, account kind/status, role IDs, encrypted TOTP secret, TOTP enabled state, recovery-code hashes, login-failure count/lock time, and last-login time. `roles.permissions` embeds the permission keys; `user_roles` is represented by `users.roleIds`.

`password_reset_tokens` stores only a SHA-256 digest, user ID, expiry, and one-use timestamp. `email_outbox` stores recipient, template key, template variables, delivery state, attempt count, next retry time, and last error name. The worker polls MongoDB and retries with bounded backoff.

The M1 migration adds JSON Schema validators and indexes to identity collections in `crm` and `audit_log` in `crm_immutable`. MongoDB Atlas roles are provisioned out of band. `crmApplication` has read/write on `crm` and only find/insert on `crm_immutable`; `crmMigrator` is a separate principal. API/worker receive `MONGODB_URI`; only the one-shot migrator receives `MONGODB_MIGRATE_URI`. Migrations verify roles and prepare schema/indexes without changing role definitions. Local Compose reproduces the authenticated roles and database split; the live Atlas probes and identity demo are deferred by owner until release preparation.
Table Key columns Rules
applications applicant_name, email, mobile,
business_name, city, state, pin,
plan_id, status ( submitted ,
needs_info , approved , rejected ),
reviewer_id, decision_reason,
partner_id
Email verified before it enters
the queue

## Source page 19

8.3 Plans and billing (M3)
Table Key columns Rules
partners code (unique, readable), parent_id,
path (materialised path), tier, plan_id,
status ( pending_payment , active ,
suspended , closed ),
business_name, legal_type, pan_enc,
gstin, address, pin, state, territory_id,
bank_account_enc, bank_ifsc,
activated_at
path is used for every downline
query; parent must be a higher
tier
partner_users partner_id, user_id, role ( owner or
staff ), staff_permissions (jsonb)
Staff permissions can only be a
subset of the owner's
kyc_documents owner_type, owner_id, doc_type,
file_key, status, verified_by,
verified_at, expires_at
Files stored in the kyc bucket;
never public
territories name, state, pin_prefixes (array),
exclusive (bool)
Used for the availability check
on apply
partner_seats plan_owner_partner_id,
assigned_partner_id, status
Count may not exceed the
plan's id_quota
Table Key columns Rules
plans key, name, tier, price_min_paise,
price_max_paise, id_quota (null
means unlimited), gst_rate_bp,
features (jsonb), active
Price on an invoice must fall
inside the band
invoices number (unique per financial
year), kind ( plan , order ,
credit_note ), partner_id,
order_id, subtotal_paise,
tax_paise, total_paise, status
( draft , issued , paid , void ),
pdf_key, issued_at
Issued invoices cannot be
edited; corrections use a credit
note
invoice_lines invoice_id, description, quantity,
unit_paise, gst_rate_bp
Totals must equal the sum of
lines

## Source page 20

8.4 Wallet and ledger (M4)
8.5 Catalogue (M5)
Table Key columns Rules
payments invoice_id, amount_paise, method,
reference, proof_file_key,
recorded_by, paid_at
Unique on reference per
method
number_sequences key, financial_year, next_value Locked row increment inside
the issuing transaction
Table Key columns Rules
wallets partner_id (unique), balance_paise,
held_paise
Cached; a nightly job proves it
equals the sum of entries and
alerts if not
ledger_entries wallet_id, seq, type ( topup , hold ,
hold_release , order_debit ,
commission , commission_reversal ,
refund , adjustment , payout ),
amount_paise (signed),
balance_after_paise, ref_type, ref_id,
idempotency_key (unique), memo,
created_by
Append-only by database
trigger; corrections are new
reversing entries; seq is
gapless per wallet
topup_requests partner_id, amount_paise, paid_on,
reference, proof_file_key, status
( pending , approved , rejected ),
reviewed_by, reason, ledger_entry_id
Unique on reference; approval
and ledger posting in one
transaction
Table Key columns Rules
service_categories key, name, sort_order, active
services category_id, key, name,
description, price_paise,
gst_rate_bp, tat_hours, active,
allowed_plan_ids (array), form_id
Price changes never alter
existing orders; an order
stores its own price

## Source page 21

8.6 Customers and orders (M5)
Table Key columns Rules
service_forms service_id, version, schema
(jsonb), published
Schema holds sections, fields,
types, validation, conditional
rules; published versions are
immutable
service_documents service_id, doc_type, required,
help_text
Drives the upload checklist
Table Key columns Rules
customers partner_id, name, mobile, email,
business_name, gstin, pan_enc,
notes, status
Duplicate warning on mobile
or GSTIN within a partner
orders number, partner_id, customer_id,
service_id, form_version,
form_data (jsonb), status,
price_paise, gst_paise,
customer_fee_paise, hold_entry_id,
assigned_to, sla_due_at,
sla_paused_total_sec,
submitted_at, completed_at
Status changes only through
the order service
order_events order_id, type, from_status,
to_status, actor_user_id, message,
created_at
Append-only
order_documents order_id, kind ( input or output ),
doc_type, file_key, version,
uploaded_by
Virus-scan status column
reserved for Phase B
order_queries order_id, raised_by, reason, due_at,
answered_at, answer
One open query at a time
per order
order_status_links order_id, token_hash, expires_at,
revoked_at
Token shown once; only its
hash is stored

## Source page 22

8.7 CRM and tools (M7, M10)
8.8 Commissions and payouts (M8)
Table Key columns Rules
leads partner_id, source, name, mobile,
email, service_id, stage ( new ,
contacted , qualified , won ,
lost ), owner_user_id,
next_followup_at, notes,
customer_id
Converting a lead creates a
customer
lead_activities lead_id, type, note, at, by_user_id Call, visit, message, note
reminders partner_id, customer_id, kind,
due_on, message, done_at
Worker sends in-app and email
reminders
lead_pages partner_id, slug (unique), title, intro,
fields (jsonb), active
Public form posts create leads
tool_invoices partner_id, number, client (jsonb),
lines (jsonb), totals, pdf_key
Partner's own invoices;
separate number series
Table Key columns Rules
commission_rules scope, service_id, category_id,
plan_id, tier, type ( flat or percent ),
value, upline_level, priority, active,
valid_from, valid_to
Most specific rule wins
commission_entries order_id, partner_id, rule_id, level,
amount_paise, status ( earned ,
reversed , paid ), ledger_entry_id
One per partner in the
chain per order
payout_requests partner_id, amount_paise, status
( requested , batched , paid ,
rejected )
Minimum from settings
payout_batches status, exported_at, paid_at,
bank_reference, total_paise
payout_items batch_id, payout_request_id,
tds_paise, net_paise

## Source page 23

8.9 Support, content, notifications, settings (M9)
8.10 Database rules that must hold
Indexes on partnerId , partners.path , orders.status , orders.assignedTo , and a
unique index on ledger_entries(walletId, seq) ; unique indexes for every field
marked unique above.
Immutable collections: ledger_entries , audit_log and order_events are written
through a database role that has only insert and find rights on them, and full read-
write on the rest. Corrections are new reversing documents.
Transactions: MongoDB runs as a replica set; every wallet, ledger, invoice-number,
order-submit, order-complete and commission change happens inside one
transaction.
Validation: a JSON-schema validator on ledger_entries , wallets , invoices ,
orders and partners , in addition to Mongoose and Zod.
Table Key columns Rules
tickets number, partner_id, order_id,
category, subject, status, priority,
assigned_to, sla_due_at
ticket_messages ticket_id, author_user_id, body,
attachments (jsonb)
content_items kind ( lesson , kit ,
announcement ), title, body,
file_key, audience, published_at
lesson_progress user_id, content_id, status, score
notifications user_id, kind, title, body, link,
read_at
In-app bell
email_templates key, subject, body Editable in settings
email_outbox to, template_key, data (jsonb),
status, attempts, sent_at,
last_error
Worker retries with back-off
settings key, value (jsonb) Company and GST details, bank
details for payments, invoice
prefix, SLA defaults, minimum
payout, TDS percent and
threshold
