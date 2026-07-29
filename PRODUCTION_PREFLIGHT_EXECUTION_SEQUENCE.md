# Production Preflight Execution Sequence

Date: 2026-05-27, Asia/Dubai

Scope: planning sequence only. Every step below writes production: `No`. This
sequence must not be treated as approval to execute production migration,
production D1 write, production deploy, feature flag enablement, dashboard
authority switch, or cutover.

| Step | Action                                                            | Target                                      | Writes Production | Requires Approval                                      | Output                                                 |
| ---: | ----------------------------------------------------------------- | ------------------------------------------- | ----------------- | ------------------------------------------------------ | ------------------------------------------------------ |
|    1 | Confirm production D1 target and production URL boundaries        | Read-only production metadata / docs        | No                | Ramadan preflight review                               | Target confirmation packet, not execution approval     |
|    2 | Confirm production backup and restore procedure                   | Backup/restore plan documents               | No                | Ramadan backup/rollback review                         | Backup/restore approval packet                         |
|    3 | Confirm production-copy freshness                                 | `homelink-finance-production-copy-dryrun`   | No                | Ramadan production-copy refresh approval if stale      | Copy freshness decision                                |
|    4 | Re-run production-copy schema dry-run if needed                   | Isolated production-copy D1 only            | No                | Explicit copy-only approval                            | Updated schema dry-run result                          |
|    5 | Re-run production-copy row-level backfill dry-run if needed       | Isolated production-copy D1 only            | No                | Explicit copy-only row-level approval                  | Updated copy row-level backfill deltas                 |
|    6 | Re-run production-copy reconciliation                             | Isolated production-copy evidence           | No                | Explicit copy-only reconciliation approval             | Money, tenant, receivables, audit/event reconciliation |
|    7 | Review money / TOP_25 remaining risks                             | Documentation and copy evidence             | No                | Ramadan accounting decision                            | Updated money risk decisions                           |
|    8 | Review tenant/property final mapping                              | Mapping decision sheet and copy evidence    | No                | Ramadan tenant/property decision                       | Final mapping decision candidate                       |
|    9 | Review receivables/accounting signoffs                            | Receivables decision sheets and copy result | No                | Ramadan accounting/business decision                   | Receivables preflight acceptance or gaps               |
|   10 | Review rollback rehearsal result                                  | Copy rollback evidence and rollback packet  | No                | Ramadan rollback owner decision                        | Production rollback readiness decision candidate       |
|   11 | Prepare final production preflight packet                         | Docs only                                   | No                | Ramadan preflight packet approval                      | Final preflight signoff packet                         |
|   12 | Require separate final production approval before any live action | Production execution not allowed here       | No                | Separate explicit production write/deploy/cutover task | Production remains `PRODUCTION_NO_GO` until then       |

## Execution Boundary

This sequence allows planning and review only. Any future command that exports
production, imports data, executes SQL, migrates D1, changes feature flags,
deploys Workers, or cuts over business traffic requires a separate task and
explicit human approval.
