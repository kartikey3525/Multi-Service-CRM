# Reports module

## Purpose

Operational and financial reports with CSV export.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Financial totals reconcile to ledger/order sources; queries enforce actor scope.

## Tests that protect this module

Seeded totals, filters, CSV shape, and isolation.
