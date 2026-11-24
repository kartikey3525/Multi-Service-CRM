# Crm module

## Purpose

Partner customers, leads, activities, and reminders.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

CRM records are partner-scoped; lead conversion is idempotent; reminders fire once.

## Tests that protect this module

Import row errors, duplicate conversion, reminder delivery, and staff access.
