# Tools module

## Purpose

Partner invoice builder, lead pages, and income calculator.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Tools are partner-scoped; income estimates carry the configured disclaimer.

## Tests that protect this module

Invoice totals, lead-page abuse controls, and estimate labeling.
