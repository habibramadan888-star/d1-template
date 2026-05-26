# Production Copy Row-Level Backfill Approval Packet

Date: 2026-05-27, Asia/Dubai

Status: `APPROVAL_REQUIRED`

Target allowed for a future task only:

- D1 name: `homelink-finance-production-copy-dryrun`
- D1 id: `c461c7f1-47bc-40cf-bbfd-1c03101943bd`

Forbidden targets:

- `homelink`
- `homelink-finance-staging`
- `d1-template-database`
- Any production D1
- Any staging D1
- Any non-copy D1

## Approval Summary

| Area                    |                                              Candidate Rows | Current State                                                             | Backfill Candidate                                                                      | Approval Required                                  | Current Decision |
| ----------------------- | ----------------------------------------------------------: | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------- |
| Money minor-unit values |                                        232 transaction rows | `*_fils` columns exist; 0 populated in inspected transaction money fields | Populate reviewed `*_fils` fields from legacy decimal values                            | Accounting + engineering + TOP_25 money risk owner | MANUAL_REQUIRED  |
| Tenant/property scope   |               381 inspected legacy rows across scope tables | Scope columns exist; 0 scoped inspected legacy rows                       | Populate `company_id`, `property_id`, `employee_id`, `owner_id` where mapping is proven | Business owner + tenant scope owner + engineering  | MANUAL_REQUIRED  |
| Receivables             | 6 legacy arrears rows plus related transaction/task context | Receivables tables exist; 0 rows                                          | Create receivable/allocation/event rows from approved lifecycle mapping                 | Accounting + engineering                           | MANUAL_REQUIRED  |
| Audit/event scope       |                              108 audit logs, 8 entry events | Scope columns exist; 0 scoped rows                                        | Populate scope fields from approved target/actor mapping                                | Business owner + engineering                       | MANUAL_REQUIRED  |
| Handover atomic data    |        25 sessions and 232 transactions as possible sources | Handover tables exist; 0 rows                                             | Create handover commits only if idempotency/session mapping is approved                 | Engineering + accounting                           | MANUAL_REQUIRED  |
| Rollback rehearsal      |                                                         N/A | Copy backup exists from REVIEW-005                                        | Restore copy backup or run exact reverse SQL on copy                                    | Engineering / operations                           | MANUAL_REQUIRED  |

## Approval Checklist

Before any future row-level copy backfill task, a human must explicitly approve:

- `--confirm-copy-row-backfill`
- `--confirm-copy-d1-target`
- `--confirm-copy-backup`
- `--confirm-row-counts-reviewed`
- `--confirm-money-conversion-reviewed`
- `--confirm-top25-money-risks-reviewed`
- `--confirm-tenant-mapping-reviewed`
- `--confirm-receivables-mapping-reviewed`
- `--confirm-audit-event-scope-reviewed`
- `--confirm-rollback-reviewed`
- `--confirm-no-production-write`
- `--confirm-no-production-deploy`
- `--confirm-no-production-migration`
- `--confirm-no-production-cutover`

## Required Evidence Before Execution

| Evidence                    | Required File / Source                                                                | Required Status    |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| Copy D1 target confirmation | `PRODUCTION_COPY_DRY_RUN_005_TARGET_CONFIRMATION.md` or fresh `d1 info`               | PASS               |
| Copy backup                 | Fresh copy backup before row-level SQL                                                | PASS               |
| SQL review                  | `PRODUCTION_COPY_ROW_LEVEL_BACKFILL_SQL_APPROVAL_REQUIREMENTS.md` plus exact SQL file | PASS               |
| Money conversion            | Accounting-reviewed legacy-to-fils conversion rules                                   | APPROVED           |
| Tenant mapping              | Human-reviewed row-level tenant/property map                                          | APPROVED           |
| Receivables mapping         | Accounting-reviewed receivable lifecycle/allocation plan                              | APPROVED           |
| Audit/event scope policy    | Business owner-reviewed visibility policy                                             | APPROVED           |
| Rollback                    | Restore or reverse update plan with verification queries                              | APPROVED           |
| Commercial launch gate      | `npm run gate:commercial-launch`                                                      | `PRODUCTION_NO_GO` |

## Current Approval Decision

`NO-GO` for row-level backfill execution until the approval checklist is complete.

This packet prepares the approval process only. It does not approve production migration, production D1 write, production deploy, or production cutover.
