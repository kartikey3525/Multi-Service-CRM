# API application

NestJS modular monolith API. MongoDB is the primary database, accessed through Mongoose; Redis supports sessions and queues.

## Public entry points

- `src/main.ts` starts the HTTP API on port 4000.
- `src/worker.ts` starts the background worker process.
- `src/config.ts` validates runtime configuration.
- `/api/health` reports readiness after the MongoDB connection is ready.

## Invariants

- Controllers handle HTTP and permission checks; services own business logic; repositories own MongoDB access.
- Money values are integer paise. Every multi-document or money-changing operation uses a MongoDB replica-set transaction.
- Structured logs include request IDs and exclude personal data and secrets.

## Checks that protect the application

- `pnpm --filter @franchise-crm/api test:integration` runs the Supertest readiness/error-shape harness against a unique `crm_test_*` database selected by `MONGODB_TEST_URI` and a matching disposable immutable database, then drops both. Never point this variable at a production database.
- Partner test fixtures live in `test/factories`; add model-specific factories with their owning milestone.
