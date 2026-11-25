# Partners module

## Purpose

Partner applications, hierarchy, profiles, and KYC.

## Current API

- Public: `GET /api/v1/public/territories`, `GET /api/v1/public/territories/availability`, `POST /api/v1/public/applications`, and `GET /api/v1/public/applications/verify-email`.
- Admin: `GET /api/v1/admin/applications`, `GET /api/v1/admin/applications/:id`, and POST actions `/:id/approve`, `/:id/reject`, `/:id/request-info`.
- Approval creates a pending-payment partner, account, partner-user link, materialized path, invite outbox item, and audit event in one MongoDB transaction. Distributor and retailer approval requires an active parent at the immediately higher tier.
- KYC records currently contain private file metadata only. Upload and authenticated file retrieval are not implemented yet.

## Invariants

Partner hierarchy must scope every partner query; KYC files must remain private; suspended partners must not transact. The complete hierarchy resolver, file access, suspension workflow, and downstream transaction guards remain M2 work.

## Tests that protect this module

Application decisions, hierarchy scoping, and cross-partner isolation.
