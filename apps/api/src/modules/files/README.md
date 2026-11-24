# Files module

## Purpose

Private object storage, uploads, and signed downloads.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Every download is permission checked; keys are not public; uploads enforce type and size limits.

## Tests that protect this module

Authorization, expiry, and rejected file types.
