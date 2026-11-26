# Billing module

## Purpose

Plans, quotes, invoices, and payment records.

## Public functions

Defined by the module service and controller APIs documented in `docs/API.md`.

## Invariants

`plans`, `invoices`, `payments`, and `number_sequences` are defined by M3-01. Invoice lines are embedded in `invoices.lines`. All monetary values are validated as safe integer paise through the shared `Money` helper and Mongoose validators. Invoice reads and payment reads apply `scopeToActor`; the repository checks the specific permission before querying. Admin-wide reads use an explicit permission-checked bypass.

`InvoiceNumberService` uses the India Standard Time April-to-March financial year and formats numbers as `YYYY-YY/000001`. Sequence row initialization is idempotent. The increment uses `findOneAndUpdate` inside the same MongoDB transaction that inserts the issued invoice, so a failed invoice insert rolls the number back. The unique `(financialYear, number)` index is the final duplicate guard. Payments carry a denormalized `partnerId` so their repository reads can apply the same hierarchy scope.

## Tests that protect this module

`invoice-numbering.test.ts` checks FY boundaries. `invoice.repository.test.ts` checks permission denial and partner subtree filter construction. `invoice-numbering.integration.test.ts` issues invoices concurrently against a MongoDB replica set and verifies gapless unique numbers plus invoice/payment cross-partner isolation. That integration test needs `MONGODB_TEST_URI`; idempotent payment recording and credit notes belong to later M3 tasks.
