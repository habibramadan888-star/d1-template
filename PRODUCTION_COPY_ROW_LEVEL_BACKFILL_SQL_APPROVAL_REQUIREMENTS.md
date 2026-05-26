# Production Copy Row-Level Backfill SQL Approval Requirements

Date: 2026-05-27, Asia/Dubai

Status: `SQL_APPROVAL_REQUIRED`

No SQL in this file was executed.

## Required SQL Properties

| Requirement                        | Applies To                | Required Before Execution                                                         |
| ---------------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| Exact target D1 name               | Every command             | Must be `homelink-finance-production-copy-dryrun`.                                |
| No production target               | Every command             | Must not mention or target `homelink` except as a forbidden target in docs.       |
| Backup first                       | Every write task          | Fresh copy backup stored under ignored `backups/`.                                |
| Statement-level purpose            | Every statement           | Human-readable reason for the mutation.                                           |
| Expected row count                 | Every `UPDATE` / `INSERT` | Row count estimate and verification query.                                        |
| Restrictive `WHERE`                | Every `UPDATE`            | Primary key or reviewed filter required; no unguarded update.                     |
| No `DELETE`                        | Every task                | Delete remains forbidden unless a separate destructive-copy-only approval exists. |
| No `DROP`                          | Every task                | Drop remains forbidden unless a separate destructive-copy-only approval exists.   |
| No amount rounding                 | Money backfill            | AED-to-fils conversion must reject unsafe decimals.                               |
| No frontend authority              | Money / tenant scope      | Frontend totals and frontend tenant_id must not be authority.                     |
| Rollback statement or restore path | Every phase               | Must be reviewed before execution.                                                |

## Required SQL Review Table

Any future executable SQL packet must include this table before execution:

| Step | SQL File / Statement | Target Table | Mutation Type | Expected Rows | Verification Query | Rollback Method | Approval |
| ---- | -------------------- | ------------ | ------------- | ------------: | ------------------ | --------------- | -------- |
| TBD  | TBD                  | TBD          | TBD           |           TBD | TBD                | TBD             | TBD      |

## Stop Conditions

Stop before execution if:

- Target D1 is not the exact production-copy D1.
- Any SQL file includes production D1 command text.
- Any `UPDATE` lacks a restrictive `WHERE`.
- Any money conversion would round instead of reject unsafe values.
- Accounting approval is missing for money or receivables.
- Tenant mapping approval is missing for scope fields.
- Audit/event visibility approval is missing.
- Rollback plan is missing.
- `gate:commercial-launch` is not `PRODUCTION_NO_GO`.

Current decision: SQL execution remains `NO-GO` until a future approval task provides exact reviewed SQL and all approval flags.
