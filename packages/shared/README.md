# Shared contracts and primitives

## Purpose

Common typed contracts consumed by the web and API workspaces.

## Public functions

`Money`, `splitGst`, `Permission`, and application, partner, invoice, top-up, order, and payout status values.

## Invariants

Money is represented as integer paise. GST components sum exactly to the rounded tax. Permission identifiers use `resource.action` naming. Status strings match the roadmap state names.

## Tests that protect this package

Unit tests cover safe-integer bounds, negative values, percentage half-up rounding, GST splits and reconciliation, unique permission identifiers, and public status values. Run with `pnpm --filter @franchise-crm/shared test`.
