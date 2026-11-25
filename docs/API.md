# API contract

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.

## Source page 24

Gapless counters: number_sequences and ledger seq use an atomic
findOneAndUpdate increment inside the same transaction as the document that uses
the number.
Partner data isolation uses repository scoping: repository queries apply
`scopeToActor(actor, filter)` or document a permission-guarded admin-only bypass.
A static test scans repository query calls. The nightly integrity job also reports
orphan references and wallets whose cached balance differs from the ledger sum. 9. API contract
Base path /api/v1 . JSON only. Cookie session; state-changing requests carry a CSRF
token. Conventions (errors, pagination, idempotency) are in section 7.1. Codex writes an
OpenAPI file from the Zod schemas and keeps it in docs/openapi.yaml ; the tables below
are the minimum route set. Each row is also a task acceptance test: allowed role succeeds,
lower role gets 403, other partner's data is not visible.
Module Endpoints
Auth POST /auth/login , /auth/admin/login ,
/auth/logout , /auth/2fa/setup ,
/auth/2fa/verify , /auth/2fa/disable (partners), /auth/password/forgot ,
/auth/password/reset , GET /auth/me
Users (admin) GET/POST /admin/users , PATCH
/admin/users/:id , PUT
/admin/users/:id/roles , GET /admin/roles
Applications POST /public/applications , GET
/public/applications/verify-email , GET
/admin/applications , POST
/admin/applications/:id/approve , /reject ,
/request-info
Partners GET /partners , GET /partners/:id , PATCH
/partners/:id , POST /partners/:id/suspend ,
/reactivate , GET /partners/tree , POST
/partners/invite , PUT /partners/me/profile ,
POST /partners/me/kyc-documents
Plans GET /plans , POST/PATCH /admin/plans , POST
/admin/plans/:id/quote

## Source page 25

Module Endpoints
Billing GET /invoices , GET /invoices/:id/pdf , POST
/admin/invoices/:id/payments , POST
/admin/invoices/:id/credit-note
Wallet GET /wallet , GET /wallet/ledger , POST
/wallet/topup-requests , GET /admin/topup-
requests , POST /admin/topup-
requests/:id/approve , /reject , POST
/admin/wallet/:partnerId/adjustments
Catalogue GET /services , GET /services/:id/form ,
POST/PATCH /admin/services , POST/PATCH
/admin/categories , POST
/admin/services/:id/forms , POST
/admin/forms/:id/publish
Orders POST /orders (draft), PATCH /orders/:id , POST
/orders/:id/submit , POST /orders/:id/cancel ,
GET /orders , GET /orders/:id , POST
/orders/:id/documents , POST
/orders/:id/queries/:qid/answer , POST
/admin/orders/:id/assign , /start , /query ,
/complete , /reject , /refund
Status link POST /orders/:id/status-link , GET
/public/status/:token
Customers GET/POST /customers , GET/PATCH
/customers/:id , POST /customers/import
Leads GET/POST /leads , PATCH /leads/:id , POST
/leads/:id/activities , POST
/leads/:id/convert , POST /public/lead-
pages/:slug/submit , GET/POST/PATCH /lead-
pages
Reminders GET/POST /reminders , PATCH /reminders/:id
Commissions GET /commissions , GET
/commissions/statement , GET/POST/PATCH
/admin/commission-rules , POST
/admin/commission-rules/preview

## Source page 26

Module Endpoints
Payouts POST /payout-requests , GET /payout-requests ,
POST /admin/payout-batches , GET
/admin/payout-batches/:id/export , POST
/admin/payout-batches/:id/mark-paid
Support GET/POST /tickets , GET /tickets/:id , POST
/tickets/:id/messages , PATCH
/admin/tickets/:id
Content GET /content , POST /content/:id/progress ,
POST/PATCH /admin/content
Tools GET/POST /tools/invoices , GET
/tools/invoices/:id/pdf
Team GET/POST /team , PATCH /team/:userId , DELETE
/team/:userId
Notifications GET /notifications , POST
/notifications/read
Reports GET /reports/:key with ?from&to&format=csv ;
keys listed in M9
Settings and audit GET/PUT /admin/settings/:key , GET
/admin/audit
Files POST /files/presign-upload , GET
/files/:key/url (short-lived, permission-
checked)
Health GET /health

## M1 identity routes implemented

- `GET /api/v1/auth/csrf` issues a short-lived CSRF token.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/admin/login` use separate account kinds and cookies. Admin login is restricted to TOTP enrollment/verification until 2FA is complete.
- `POST /api/v1/auth/2fa/setup`, `POST /api/v1/auth/2fa/verify`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me` cover the session lifecycle.
- `POST /api/v1/auth/password/forgot` always returns `{ accepted: true }`; `POST /api/v1/auth/password/reset` consumes a one-use token.
- `POST /api/v1/auth/password/change` checks the signed-in user's current password, updates its Argon2id hash, revokes active sessions, and appends an audit event.
- Admin user and role reads/writes live under `/api/v1/admin/users` and `/api/v1/admin/roles`; audit reads are `GET /api/v1/admin/audit` with actor, entity, action, date, and pagination filters.

All non-public routes require an explicit permission decorator. The global guard validates account kind, role permissions, session state, and CSRF on state-changing calls. Partner requests require an active membership and resolve the allowed subtree from MongoDB's materialized path. Mutations are denied for suspended/closed/pending-payment partners except permitted KYC upload while pending payment.

## M2 partner applications (implemented subset)

- `GET /v1/public/territories?state=` lists active application territories.
- `GET /v1/public/territories/availability?state=&pin=` checks active territory coverage and exclusive assignment.
- `POST /v1/public/applications` is CSRF protected and rate limited by IP and email; it creates an email-verification outbox item.
- Successful application submission returns an expiring upload capability once. `POST /v1/files/kyc/applications/:applicationId` accepts the capability as multipart `uploadToken`, with `docType` and file, and still requires CSRF. Only the token hash is stored in MongoDB; no storage URL is returned.
- `GET /v1/public/applications/verify-email?token=` consumes a hashed, expiring verification token.
- `GET /v1/admin/applications?status=&page=&pageSize=&q=`, `GET /v1/admin/applications/eligible-parents?tier=`, and `GET /v1/admin/applications/:id` require `applications.read`.
- `POST /v1/admin/applications/:id/approve`, `/reject`, and `/request-info` require `applications.review` and CSRF. Decisions write audit and email-outbox records transactionally. Approval creates a pending-payment partner and invite; distributor and retailer applications require the active parent ID.

The reviewer displays KYC metadata and authenticated API-view links. Private upload/retrieval, partner profile uploads, partner list/detail/status, and encrypted KYC fields are implemented below. Invite quota, expiry reminders, and partner 2FA reset remain pending M2.

## Private KYC file API (implemented)

- `POST /v1/files/kyc` (permission `files.upload`, CSRF) accepts one multipart PDF, JPEG, or PNG, at most 10 MiB, with `ownerType`, `ownerId`, and `docType`. The server verifies the MIME type and file signature. Objects are stored in the private `S3_BUCKET`; the API does not issue public URLs.
- `POST /v1/files/kyc/applications/:applicationId` is CSRF protected and accepts the expiring application upload capability and file; it attaches files only to unapproved applications.
- `GET /v1/files/kyc/mine` returns metadata for the signed-in partner's own files.
- `GET /v1/files/kyc/:id` (permission `files.download`) streams through the authenticated API. Admin reads additionally require `applications.read` for application documents or `partners.read` for partner documents. Partner reads are limited to partner IDs in the caller's materialized subtree. Each successful view creates an immutable `kyc.document_viewed` audit event.
- Responses use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. Local storage uses RustFS; configure `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, and `S3_BUCKET`.

## M2 partner management (implemented subset)

- `GET /v1/admin/partners` and `GET /v1/admin/partners/:id` require `partners.read`.
- `PUT /v1/admin/partners/:id/status` requires `partners.manage`. It suspends/reactivates active partners, writes audit events, and revokes linked partner-user sessions on suspension.
- `PATCH /v1/admin/partners/:id/kyc-fields` requires `partners.manage`; PAN, GSTIN, address, bank account, and IFSC are AES-256-GCM encrypted before MongoDB storage. Responses contain masked values only.
- `GET /v1/partner/network` requires `team.read`; it returns the signed-in partner's non-closed downline and counts by tier, scoped by MongoDB materialized path.
