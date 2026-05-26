# Production Copy Dry-Run Execution Plan

Date: 2026-05-27, Asia/Dubai

Status: `APPROVAL_REQUIRED`

Target for future execution only:

- D1 name: `homelink-finance-production-copy-dryrun`
- D1 id: `c461c7f1-47bc-40cf-bbfd-1c03101943bd`

This file is a plan. No D1 command in this file was executed during
COMMERCIAL-LAUNCH-REVIEW-004.

## Phase Plan

| Phase | Goal                                       | Command Type                               | Target          | Writes Copy? | Writes Production? | Approval Required | Stop Condition                                          |
| ----: | ------------------------------------------ | ------------------------------------------ | --------------- | ------------ | ------------------ | ----------------- | ------------------------------------------------------- |
|     0 | Confirm copy target and current row counts | read-only `d1 info` / count queries        | production-copy | no           | no                 | yes               | target is not exact copy D1                             |
|     1 | Snapshot copy before migration dry-run     | `d1 export` copy only                      | production-copy | no           | no                 | yes               | backup path not ignored                                 |
|     2 | Apply reviewed schema-only migrations      | `d1 execute --file <schema.sql>`           | production-copy | yes          | no                 | yes               | SQL contains destructive or production-target operation |
|     3 | Validate schema and row counts             | read-only schema/count queries             | production-copy | no           | no                 | yes               | unexpected schema or count delta                        |
|     4 | Apply reviewed backfill dry-run SQL        | `d1 execute --file <backfill.sql>`         | production-copy | yes          | no                 | yes               | UPDATE missing WHERE or mapping not approved            |
|     5 | Run reconciliation reports                 | read-only scripts / SQL                    | production-copy | no           | no                 | yes               | money/tenant/receivables mismatch not explained         |
|     6 | Rollback rehearsal on copy                 | restore copy backup or reverse SQL on copy | production-copy | yes          | no                 | yes               | rollback does not restore expected baseline             |
|     7 | Final copy dry-run decision                | report-only                                | local repo      | no           | no                 | yes               | any blocker remains unresolved                          |

## Candidate Input Files

| Area                          | Candidate Input                                                                                                         | Current Status                                          | Required Review                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Money minor-unit fields       | `migration-drafts/005_money_minor_units_dual_write_draft.sql`                                                           | draft only                                              | accounting + engineering                                     |
| Tenant compatibility columns  | `migration-drafts/tenant_scope_staging_compatibility_columns_draft.sql`                                                 | staging-proven pattern, production-copy review required | tenant mapping + engineering                                 |
| Receivables schema            | `migration-drafts/004_receivables_model_draft.sql` and `migration-drafts/receivables_local_staging_rehearsal_draft.sql` | draft/local-staging only                                | accounting + engineering                                     |
| Handover atomic schema        | `migration-drafts/handover_atomic_commit_draft.sql`                                                                     | draft/local-staging only                                | accounting + engineering                                     |
| Local staging handover tables | `migrations/local/002_handover_atomic_staging.sql`                                                                      | local/staging only                                      | must not be copied blindly to production-copy without review |

## Required Guardrails

- Every target command must name `homelink-finance-production-copy-dryrun`.
- No command may target `homelink`, `homelink-finance-staging`, or
  `d1-template-database`.
- Every SQL file must be reviewed for `DROP`, `DELETE`, unsafe `UPDATE`,
  production-specific names, secrets, and non-idempotent DDL.
- Every row-level `UPDATE` must have a precise `WHERE` clause and expected row
  count.
- Money conversion must use integer fils and must not silently round values.
- Tenant mapping must not treat legacy `CORPID` as final SaaS authority.
- Frontend totals must not become accounting authority.

## Required Outputs For Future Execution Task

- `PRODUCTION_COPY_PRE_DRY_RUN_SNAPSHOT.md`
- `PRODUCTION_COPY_SCHEMA_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_BACKFILL_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_RECONCILIATION_RESULT.md`
- `PRODUCTION_COPY_ROLLBACK_DRY_RUN_RESULT.md`
- `PRODUCTION_COPY_DRY_RUN_FINAL_DECISION.md`

Conclusion: production-copy dry-run can proceed only in a future approval task.
COMMERCIAL-LAUNCH-REVIEW-004 does not authorize execution.
