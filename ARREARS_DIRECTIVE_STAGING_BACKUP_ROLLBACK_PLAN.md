# Arrears Directive Staging Backup And Rollback Plan

Date: 2026-05-31

Result: `PLAN_ONLY_BLOCKED_BY_SCHEMA`

The approved staging write QA stopped before business writes because the staging schema does not fully support the real directive closure contract.

## Potential Write Scope

| Table | Intended Write | Maximum Scope |
|---|---|---:|
| `arrear_tasks` | Assign up to two test tasks, then store employee promised date and note. | 2 rows |
| `entry_events` | Record directive assignment and employee follow-up events. | 4 rows |
| `audit_logs` | Record owner create and employee follow-up API audits. | 4 rows |

## Test Data Identification

| Identifier | Format |
|---|---|
| Owner idempotency key | `stg-arrears-directive-owner-<timestamp>` |
| Employee idempotency key | `stg-arrears-directive-followup-<timestamp>-<task>` |
| Owner note | `QA_ARREARS_DIRECTIVE_STAGING_WRITE_<timestamp>` |
| Employee note | `QA_ARREARS_DIRECTIVE_STAGING_FOLLOWUP_<timestamp>` |

## Rollback Strategy

If staging write QA is later re-approved after schema support:

1. Snapshot selected `arrear_tasks` rows before write.
2. Use the QA idempotency keys and QA notes to identify affected rows.
3. Restore only directive/follow-up fields on selected rows, or mark test directives `cancelled` if preserving QA evidence is preferred.
4. Preserve audit/event records unless separate cleanup approval is granted.
5. Never run rollback against production.

## Rollback Approval

Rollback is a staging D1 write. It requires the same staging-only approval boundary and must not use production D1.

## Current Status

No rollback was needed in this run because no business write was executed.
