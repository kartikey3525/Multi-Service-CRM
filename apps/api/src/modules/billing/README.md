# Billing module

## Purpose

Plans, quotes, invoices, and payment records.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Money is integer paise; invoice numbering is unique and gapless; issued invoices are immutable.

## Tests that protect this module

Tax split, invoice numbering concurrency, idempotent payments, and credit notes.
