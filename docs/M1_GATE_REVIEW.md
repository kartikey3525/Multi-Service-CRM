# M1 staging gate review

**Review date:** 2026-11-24  
**Decision:** Not passed; staging security evidence and owner sign-off are unavailable. M2 remains gated.

## Evidence reviewed

- `docs/PROGRESS.md`, `docs/MILESTONES.md`, `docs/DECISIONS.md`, `docs/QUESTIONS.md`, and `docs/QUALITY_AND_RISKS.md`.
- Local checks recorded in `docs/PROGRESS.md`: `make check` passed; `pnpm e2e` passed 5/5; migrations 202611240003 through 202611240005 applied, with a repeat showing no pending migrations.
- Hosted Actions run 45372003559 passed on implementation commit `15a6987`; tracker-only commit `9781374` also passed run 45372789418.
- `mongosh` inspection of the local development database showed `crmApplication` grants find/insert/update/remove/index operations on identity collections and inherits `auditAppender`, which grants find/insert/index discovery on `audit_log`.
- Local Compose MongoDB is unauthenticated. The local API uses that unrestricted connection, so the inspected Mongo roles were not enforced by the running application.

## Gate checklist

| Gate requirement                                          | Result                    | Evidence / remaining work                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 identity implementation and local acceptance           | Pass                      | Local API integration, unit checks, build, and browser checks passed; hosted CI is green.                                                                                       |
| Separate runtime and migration database identities        | Implemented, not deployed | API/worker receive only authenticated runtime `MONGODB_URI`; `MONGODB_MIGRATION_URI` is limited to the one-shot migrator. No staging target or credentials are configured here. |
| Runtime database principal restricted to `crmApplication` | Not verified              | Create the runtime principal in the staging database and authenticate the API/worker with it.                                                                                   |
| Runtime identity cannot update or delete audit records    | Not verified              | Against staging, prove audit reads/inserts succeed and update/delete attempts are denied by MongoDB authorization.                                                              |
| Admin and partner identity flows on staging               | Not run                   | Demonstrate login, mandatory admin TOTP, partner TOTP enrollment and disable, role permissions, password reset via mail, and audit visibility on the staged site.               |
| M0 GST rounding decision reviewed by owner                | Pending                   | Owner review remains open in `docs/QUESTIONS.md`.                                                                                                                               |
| Live staging demo reviewed and approved by owner          | Pending                   | No staging site is configured or reachable from this workspace.                                                                                                                 |

## Staging access preflight

This workspace contains only local and development Compose files, has no configured staging Mongo environment variable names, and exposes only local Docker Desktop contexts. No staging identity provisioning or runtime-denial test was attempted. Local development data was left intact.

The first review also found that the migration URI was being injected into the API and worker containers. That was removed before any staging credentials were configured. The `migrator` Compose profile is now the only service that receives `MONGODB_MIGRATION_URI`; the API and worker receive only `MONGODB_URI`. A non-revealing Compose inspection reported the variable absent for `api` and `worker`, present for `migrator`, and the recreated local containers confirmed the migration variable is absent. `make check`, `pnpm e2e`, and local migration checks passed after the change.

Select the MongoDB deployment type before proceeding. The migrations manage custom roles using database `createRole` and `updateRole` commands. MongoDB Atlas does not support those commands; Atlas custom roles must be managed through its supported UI, CLI, Administration API, or integrations, and the migration path must be adapted to skip role-management commands there. See [Atlas custom database roles](https://www.mongodb.com/docs/atlas/security-add-mongodb-roles/) and [Atlas unsupported commands](https://www.mongodb.com/docs/atlas/unsupported-commands/).

Before this gate can pass, provide an existing staging deployment target and a secure way for this workspace to access its administrative Mongo connection and deployment settings. Put credentials in the deployment secret store or a locally injected secret mechanism; do not commit them or send them in chat. Then provision separate principals, bind the runtime principal only to `crmApplication`, deploy the API and worker with that principal, run authorization probes, execute the staging identity demo, and record the results here. The owner must resolve the GST rounding question and approve the live demo. Do not start M2 until these steps pass.
