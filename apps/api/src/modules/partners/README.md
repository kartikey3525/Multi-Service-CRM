# Partners module

## Purpose

Partner applications, hierarchy, profiles, and KYC.

## Current API

- Public: `GET /api/v1/public/territories`, `GET /api/v1/public/territories/availability`, `POST /api/v1/public/applications`, and `GET /api/v1/public/applications/verify-email`.
- Admin: `GET /api/v1/admin/applications`, `GET /api/v1/admin/applications/:id`, and POST actions `/:id/approve`, `/:id/reject`, `/:id/request-info`.
- Approval creates a pending-payment partner, account, partner-user link, materialized path, invite outbox item, and audit event in one MongoDB transaction. Distributor and retailer approval requires an active parent at the immediately higher tier.
- KYC document upload/retrieval uses the private files module; see `../files/README.md`. The review queue renders authenticated API-view links.
- Admin partner list/detail and suspend/reactivate are available; suspension revokes sessions for linked partner users. PAN, GSTIN, address, bank account, and IFSC are encrypted at rest and update responses contain masked values only.

## Invariants

Partner hierarchy scopes partner queries through the materialized path; KYC files remain private; non-active partners cannot perform writes, except pending-payment KYC upload. Transaction/top-up routes do not exist yet and must enforce the same active-only invariant in M4/M5.

## Tests that protect this module

Application decisions, hierarchy scoping, and cross-partner isolation.
