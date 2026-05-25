# STAGING QA 005 Database Evidence

Generated: 2026-05-25T15:08:40+04:00

Scope: read-only staging D1 count snapshot after pre-write blocker. Command targeted only `homelink-finance-staging`.

| Snapshot                     | Table                     | Before Count | After Count | Expected Change | Result  | Notes                                                                 |
| ---------------------------- | ------------------------- | -----------: | ----------: | --------------- | ------- | --------------------------------------------------------------------- |
| Employee entry valid write   | sessions                  |            0 |           0 | Not executed    | BLOCKED | No staging business write was attempted.                              |
| Employee entry valid write   | transactions              |            0 |           0 | Not executed    | BLOCKED | No staging business write was attempted.                              |
| Employee entry invalid write | sessions                  |            0 |           0 | No change       | PASS    | Invalid write not attempted because feature flag precondition failed. |
| Employee entry invalid write | transactions              |            0 |           0 | No change       | PASS    | Invalid write not attempted because feature flag precondition failed. |
| Handover staging valid write | handover_commits          |            0 |           0 | Not executed    | BLOCKED | Handover endpoint returned `403 FEATURE_DISABLED`.                    |
| Handover staging valid write | handover_commit_rows      |            0 |           0 | Not executed    | BLOCKED | Handover endpoint returned `403 FEATURE_DISABLED`.                    |
| Handover staging valid write | handover_idempotency_keys |            0 |           0 | Not executed    | BLOCKED | Handover endpoint returned `403 FEATURE_DISABLED`.                    |
| Handover staging safety      | transactions              |            0 |           0 | No change       | PASS    | Staging handover did not write legacy financial tables.               |
| Handover staging safety      | deposit_ledger            |            0 |           0 | No change       | PASS    | Staging handover did not write legacy financial tables.               |
| Handover staging safety      | arrears                   |            0 |           0 | No change       | PASS    | Staging handover did not write legacy financial tables.               |
| Audit evidence               | audit_logs                |            0 |           0 | Not executed    | BLOCKED | No write action occurred.                                             |
| Entry evidence               | entry_events              |            0 |           0 | Not executed    | BLOCKED | No write action occurred.                                             |
| Handover audit evidence      | handover_audit_events     |            0 |           0 | Not executed    | BLOCKED | No handover write action occurred.                                    |

Read-only D1 metadata showed `changed_db=false`, `changes=0`, and `rows_written=0`.
