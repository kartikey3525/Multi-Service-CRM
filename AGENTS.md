# AGENTS.md

## Deferred before release

- [ ] Provision and verify the `crm_app` and `crm_migrator` identities on MongoDB Atlas.
- [ ] Run the MongoDB authorization probes against staging.
- [ ] Run the staging identity demo.
- [ ] Confirm the Atlas IP access list is restricted to approved deployment sources.
- [ ] Complete these checks before M10 release; local development and M2+ do not wait on staging.

## Project

Multi-service franchise portal: public site, partner portal, admin portal, one API.
Full specification is in `docs/`. Read `docs/PROGRESS.md` first and take the first unchecked task in order.
Stack: see `docs/DECISIONS.md`.

## Commands

- `make up` — build and start the production-style container stack
- `make up-dev` — build and start the local development stack with Mailpit and Mongo Express
- `make check` — lint, typecheck, unit and API integration tests, and build (start `make up-dev` first)
- `make e2e` — Playwright against the compose stack
- `make migrate` — apply migrate-mongo migrations
- `make seed` — load seed data

## Architecture rules

- Layers: controller -> service -> repository. Only repositories access MongoDB models.
- Every route declares a permission; every repository query scopes data to the actor's partner hierarchy.
- Money is integer paise via the Money helper. Never use floating point for money.
- Balances change only through the ledger service. Ledger, audit, and event records are append-only.
- Request and response shapes are shared Zod schemas.
- All user-facing text lives in `apps/web/src/messages/en.json`.
- Business records are never hard-deleted.

## Process rules

- One task per commit or pull request; commit message starts with its task ID.
- Write tests first. Include permission and cross-partner isolation tests for every endpoint.
- Do not invent requirements. If the spec is silent, use the documented default, add a line to `docs/QUESTIONS.md`, and continue.
- Justify every new dependency in `docs/DECISIONS.md`.
- Never edit an applied migration. Never commit secrets; update `.env.example` for new variables.
- After each task, update the relevant module README and `docs/PROGRESS.md`.
- At the last task of a milestone, stop and write a gate summary.
- The owner authorized publishing this project to `https://github.com/kartikey3525/Multi-Service-CRM.git`. Commit each completed task on `main` and push it to `origin` after local checks, unless the owner asks to hold or review changes first. Never stage secrets, `.env` files, dependency folders, build output, or test reports.

## Release 1 exclusions

Anything listed in `docs/SPEC.md` under out-of-scope integrations. Phase B adapters remain disabled stubs.
