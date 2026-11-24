# Orders module

## Purpose

Customer orders, lifecycle, documents, and status links.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Status changes occur only in the order service; events are append-only; partner data is scoped.

## Tests that protect this module

Every state transition, ledger effect, SLA pause, and cross-partner isolation.
