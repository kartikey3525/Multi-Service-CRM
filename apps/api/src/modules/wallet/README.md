# Wallet module

## Purpose

Partner wallets, top-ups, and append-only ledger.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

All balance changes go through LedgerService; ledger entries are immutable; idempotency keys are unique.

## Tests that protect this module

Concurrency, rollback, duplicate posting, holds, and reconciliation.
