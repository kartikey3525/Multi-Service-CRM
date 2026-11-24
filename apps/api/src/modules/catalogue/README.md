# Catalogue module

## Purpose

Service categories, services, documents, and versioned forms.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Published forms are immutable; needs_review services cannot be ordered.

## Tests that protect this module

Schema validation, publication versioning, and catalogue import idempotency.
