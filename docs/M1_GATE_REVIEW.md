# M1 gate review

**Review date:** 2026-11-24  
**Decision:** Accepted by owner on local evidence. **Live staging checks deferred by owner.**

## Evidence and decision

The owner accepted M1 based on the previously recorded local evidence: `make check`, browser E2E, and Mongo integration passing. See [PROGRESS.md](PROGRESS.md) for the exact prior commands and results. The staging gate is explicitly deferred until the owner connects the staging server after development is complete. M2 may proceed; no staging credentials or Atlas deployment were accessed for this decision.

The approved Atlas identities are `crm_app` (`crmApplication`) for API/worker runtime and `crm_migrator` (`crmMigrator`) for migration runs. Database credentials are not recorded here. The Atlas project/cluster are `crm-staging` / `Cluster0`.

## Deferred before release

- [ ] Provision and verify the `crm_app` and `crm_migrator` identities on Atlas.
- [ ] Run authorization probes proving runtime append/read succeeds and audit update/delete are denied.
- [ ] Run the staging identity demo.
- [ ] Confirm the Atlas IP access list is restricted to approved deployment sources.

The owner will connect the staging server after development is complete. These checks are release blockers before M10, not blockers to M2–M9. See the checklist at the top of [AGENTS.md](../AGENTS.md).

## Local topology

`crm` stores mutable application records. `crm_immutable` stores `audit_log`, `ledger_entries`, and `order_events`. API and worker receive only `MONGODB_URI`; the one-shot migrator receives only `MONGODB_MIGRATE_URI`. Migrations do not create/update MongoDB authorization roles; they verify required roles and prepare schemas/indexes. Local bootstrap provisions the equivalent roles so local API/integration tests exercise authorization.

Legacy development data in `franchise_crm` is retained as a source copy while the forward migration copies identity and audit records to the new databases. Do not drop the legacy database or named Mongo volumes.

## Validation status

The owner accepted M1 on the prior local evidence. The follow-on database split/authenticated local role work also passed `make check`, `make e2e` (5/5), the local authorization probe, migration repeat, and HTTP reachability checks on 2026-11-24. Staging probes/demo have not been run by owner decision.
