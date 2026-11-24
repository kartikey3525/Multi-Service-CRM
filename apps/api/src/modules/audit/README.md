# Audit module

## Purpose

Append-only record of administrative and money-related actions.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Audit records cannot be updated or deleted; before/after data is captured where required.

## Tests that protect this module

Append-only storage and event completeness.
