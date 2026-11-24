# Notifications module

## Purpose

In-app notifications and email outbox delivery.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

Email retries are bounded/backed off; messages contain no secrets or unnecessary personal data.

## Tests that protect this module

Retry behavior, idempotent delivery, and recipient scoping.
