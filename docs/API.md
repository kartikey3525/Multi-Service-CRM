# API contract

> Source: _Multi-Service Franchise CRM: Product & Engineering Roadmap_ (44 pages). This repository copy is the working specification.

## Source page 24

Gapless counters: number_sequences and ledger seq use an atomic
findOneAndUpdate increment inside the same transaction as the document that uses
the number.
Scoping instead of row-level security: MongoDB has no row-level security, so
isolation depends on repository scoping and its tests; a nightly integrity job also
reports orphan references and wallets whose cached balance differs from the ledger
sum. 9. API contract
Base path /api/v1 . JSON only. Cookie session; state-changing requests carry a CSRF
token. Conventions (errors, pagination, idempotency) are in section 7.1. Codex writes an
OpenAPI file from the Zod schemas and keeps it in docs/openapi.yaml ; the tables below
are the minimum route set. Each row is also a task acceptance test: allowed role succeeds,
lower role gets 403, other partner's data is not visible.
Module Endpoints
Auth POST /auth/login , /auth/admin/login ,
/auth/logout , /auth/2fa/setup ,
/auth/2fa/verify , /auth/password/forgot ,
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

All non-public routes require an explicit permission decorator. The global guard validates account kind, role permissions, session state, and CSRF on state-changing calls. Partner scopes fail closed until M2 resolves the partner hierarchy.
