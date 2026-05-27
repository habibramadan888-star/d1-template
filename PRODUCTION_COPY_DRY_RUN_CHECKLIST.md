# Production Copy Dry-Run Checklist

Date: 2026-05-27, Asia/Dubai

Status: `COPY_SCHEMA_DRY_RUN_COMPLETE_RECONCILIATION_MANUAL_REQUIRED`

Production cutover: `PRODUCTION_NO_GO`

|   # | Checklist Item                                  | Required Before Copy Dry-Run | Current Status    |
| --: | ----------------------------------------------- | ---------------------------- | ----------------- |
|   1 | Production D1 name / id confirmed               | Yes                          | CONFIRMED         |
|   2 | Production backup completed                     | Yes                          | COMPLETED         |
|   3 | Backup stored outside git                       | Yes                          | CONFIRMED         |
|   4 | Production-copy D1 created                      | Yes                          | COMPLETED         |
|   5 | Production-copy D1 restored/imported            | Yes                          | COMPLETED         |
|   6 | Production-copy not bound to production Worker  | Yes                          | CONFIRMED         |
|   7 | Production-copy feature flags disabled          | Yes                          | NOT_BOUND         |
|   8 | Production-copy migration dry-run plan reviewed | Yes                          | COMPLETED_ON_COPY |
|   9 | Production-copy backfill dry-run plan reviewed  | Yes                          | MANUAL_REQUIRED   |
|  10 | Row counts expected                             | Yes                          | RECORDED          |
|  11 | Rollback plan reviewed                          | Yes                          | MANUAL_REQUIRED   |
|  12 | Accounting review completed                     | Yes                          | MANUAL_REQUIRED   |
|  13 | Tenant mapping review completed                 | Yes                          | MANUAL_REQUIRED   |
|  14 | Receivables review completed                    | Yes                          | MANUAL_REQUIRED   |
|  15 | TOP_25_MONEY_RISKS reviewed                     | Yes                          | MANUAL_REQUIRED   |
|  16 | Commercial launch gate still `PRODUCTION_NO_GO` | Yes                          | CONFIRMED         |

## Stop Conditions

Stop before copy dry-run if any of the following is missing:

- Production D1 target confirmation.
- Backup approval.
- Rollback plan.
- Copy isolation plan.
- Exact migration/backfill plan.
- Accounting/data owner review.
- Tenant mapping review.

Conclusion: production-copy D1 was created and imported. Migration/backfill,
rollback rehearsal, accounting review, tenant mapping review, and production
cutover remain approval-gated and `PRODUCTION_NO_GO`.

## REVIEW-005 Update

Schema-only dry-run migrations were applied to
`homelink-finance-production-copy-dryrun` after copy backup. Existing business
row counts did not change. Backfill and reconciliation remain
`MANUAL_REQUIRED` because money conversion, tenant mapping, receivables
allocation, audit/event scope, and TOP_25 money risks still need human approval.

## REVIEW-006 Update

Row-level backfill approval packet is ready. Execution remains NO-GO until the
future task receives explicit approvals for copy target, backup, row counts,
money conversion, TOP_25 money risks, tenant mapping, receivables mapping,
audit/event scope, rollback, and no-production-write constraints.

## REVIEW-007 Update

Copy-only row-level compatibility backfill was executed on
`homelink-finance-production-copy-dryrun` after copy backup and target
confirmation.

Result:

- Money `*_fils` compatibility backfill: PASS on copy.
- Tenant/property compatibility backfill: PASS_WITH_WARNINGS on copy.
- Audit/event scope compatibility backfill: PASS_WITH_WARNINGS on copy.
- Receivables data backfill: MANUAL_REQUIRED, not executed.
- Rollback execution: MANUAL_REQUIRED, not executed.
- Production D1 write: no.
- Production deploy: no.
- Production migration: no.
- Production cutover: `PRODUCTION_NO_GO`.

## REVIEW-008 Update

Manual reconciliation review was completed without running any D1 command.

Result:

- Money conversion evidence: acceptable for copy review; accounting signoff still required.
- Tenant/property compatibility evidence: accepted as compatibility-only; final SaaS mapping still required.
- Audit/event compatibility evidence: accepted as compatibility-only; visibility policy still requires review.
- Receivables data/allocation backfill: MANUAL_REQUIRED.
- Copy rollback rehearsal: APPROVAL_REQUIRED.
- Production D1 write: no.
- Production deploy: no.
- Production migration: no.
- Production cutover: `PRODUCTION_NO_GO`.
