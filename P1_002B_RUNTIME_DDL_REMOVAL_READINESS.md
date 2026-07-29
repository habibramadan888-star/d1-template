# P1-002B Runtime DDL Removal Readiness

Generated: 2026-05-25T03:42:25+04:00

Scope: readiness gate for moving runtime `CREATE TABLE` / `ALTER TABLE` out of Worker request paths. This task does not remove runtime DDL and does not execute migrations.

## Current Classification

| Runtime DDL Category              | Covered By Local Migration | Still Needed For Production Compatibility | Removal Readiness | Recommendation                                                  |
| --------------------------------- | -------------------------- | ----------------------------------------- | ----------------- | --------------------------------------------------------------- |
| `active_sessions` creation        | Yes                        | Yes                                       | Not ready         | Keep until production migration is applied and verified         |
| `employee_users` creation         | Yes                        | Yes                                       | Not ready         | Keep until employee auth schema is migration-owned              |
| `audit_logs` creation             | Yes                        | Yes                                       | Not ready         | Keep until unified audit model is approved                      |
| `sessions` creation/columns       | Partially                  | Yes                                       | Not ready         | Keep until P0-001/P0-008/P0-006 schema decisions are complete   |
| `transactions` creation/columns   | Partially                  | Yes                                       | Not ready         | Keep until minor-unit migration and reconciliation are approved |
| `arrear_tasks` creation/columns   | Partially                  | Yes                                       | Not ready         | Keep until receivables migration is live                        |
| `entry_events` creation           | Yes                        | Yes                                       | Not ready         | Keep until audit/event schema is migration-owned                |
| `deposit_ledger` creation/columns | Partially                  | Yes                                       | Not ready         | Keep until deposit liability reconciliation is approved         |
| `app_settings` creation           | Yes                        | Yes                                       | Not ready         | Keep until company/property settings migration exists           |
| Runtime indexes                   | Partially                  | Yes                                       | Not ready         | Remove only after drift check proves indexes exist              |

## Removal Preconditions

| Precondition                                            | Status                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Production migration process documented and approved    | Not complete                                                    |
| Staging D1 environment confirmed                        | Manual required                                                 |
| Production backup/rollback plan confirmed               | Not complete                                                    |
| P0-001 money schema decision complete                   | Partial                                                         |
| P0-006 tenant/property scope complete                   | Partial                                                         |
| P0-008 receivables complete                             | Partial                                                         |
| Runtime DDL disabled in staging without startup failure | Not tested                                                      |
| Embedded/source artifacts both checked                  | Partial; critical drift currently 0 but dry-run warning remains |

## Gate Conclusion

P1-002B status: runtime DDL removal readiness gate prepared.

GO for controlled local/staging runtime DDL disable rehearsal: not yet; needs a feature flag/design first.

NO-GO for deleting runtime DDL from production Worker: yes.

No runtime DDL was removed in this task.
