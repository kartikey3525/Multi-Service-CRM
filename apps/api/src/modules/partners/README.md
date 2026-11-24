# Partners module

## Purpose

Partner applications, hierarchy, profiles, and KYC.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Partner hierarchy scopes every partner query; KYC files remain private; suspended partners cannot transact.

## Tests that protect this module

Application decisions, hierarchy scoping, and cross-partner isolation.
