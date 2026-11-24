# Commissions module

## Purpose

Commission rules, entries, statements, and payouts.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Commission derives from configured rules; refunds reverse earned amounts; payouts cannot exceed funds.

## Tests that protect this module

Rule precedence, exactly-once credits/reversals, and payout limits.
