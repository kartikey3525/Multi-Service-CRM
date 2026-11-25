# Files module

## Purpose

Private object storage, uploads, and authenticated API streaming.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

`POST /api/v1/files/kyc` accepts one multipart `file` (PDF/JPEG/PNG, max 10 MiB) plus `ownerType`, `ownerId`, and `docType`. The API checks the actual file signature, writes to a private S3-compatible bucket with no ACL/public URL, then stores metadata and the private key in MongoDB. Partners may write only to their own profile; reviewers may attach files only to applications.

Applicants may also use `POST /api/v1/files/kyc/applications/:applicationId` with the expiring upload capability returned at application submission. Only its hash is stored; the capability is not logged or placed in the email outbox. CSRF, rate limits, file checks, and pending-application state are enforced.

`GET /api/v1/files/kyc/mine` lists the current partner's KYC metadata without exposing object keys.

`GET /api/v1/files/kyc/:id` streams through the API after permission and owner/subtree checks. It sets `private, no-store` and `nosniff`, and inserts an immutable audit event on every successful view. No presigned download URL is generated.

## Invariants

Every download is permission checked; keys are not public; uploads enforce type and size limits.

## Tests that protect this module

Authorization, expiry, and rejected file types.
