# Commercial Launch Review 015 Starting Context

Date: 2026-05-27, Asia/Dubai

Scope: receivables and accounting-rule review support only. This task does not
approve production, execute deploys, run migrations, write D1, change dashboard
behavior, or change financial formulas.

## Current Production Blocker

Receivables and accounting rules are still production blockers because the
project has staging/local evidence, but not final Ramadan approval for the
business semantics that determine production financial authority.

Open decisions include:

- Receivable lifecycle rules for rent due, due today, overdue, arrears,
  outstanding, paid, settled, voided, adjusted, and corrected states.
- Payment allocation rules for short pay, partial repayment, full repayment,
  overpayment, refund, and correction.
- Deposit liability rules, including deposit collection, refund, deduction, and
  whether any deposit movement may offset rent.
- Dashboard authority rules for due, overdue, arrears, rent received, monthly
  income, and history/reporting.
- Rollback and correction rules if production migration/backfill produces an
  incorrect receivable/accounting result.

## Existing Staging Evidence

| Evidence                                              | Result               | What It Proves                                                                                                                                                                                | Limit                                                                              |
| ----------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `RECEIVABLES_SOURCE_OF_TRUTH.md`                      | Defined              | Future receivables concepts, integer-fils rules, void handling, deposits separated from rent receivables by default, and frontend totals not authority.                                       | Source-of-truth proposal only, not production approval.                            |
| `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`       | PASS                 | Rent due, short pay, repayment, overpayment, voided payment, deposit handling, credit adjustment, debit adjustment, and future dashboard authority are computable in local/staging rehearsal. | Dashboard authority remains `MANUAL_REQUIRED`; live dashboard unchanged.           |
| `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`     | PASS                 | Staging shadow matched due today, overdue, arrears, rent due, rent received, short pay, partial repayment, full repayment, void impact, and deposit exclusion.                                | Adjustment credit/debit remain expected differences requiring accounting approval. |
| `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md` | PASS / NO-GO         | Future dashboard values can be computed from receivables shadow evidence.                                                                                                                     | Production status remains `NO-GO`; no live dashboard mutation.                     |
| `RECEIVABLES_DASHBOARD_AUTHORITY_GATE.md`             | NO-GO for production | Documents future dashboard authority and rollback strategy.                                                                                                                                   | Requires migration, tenant scope, accounting review, and rollback approval.        |

## Existing Production-Copy Evidence

| Evidence                                                    | Result          | What It Proves                                                                                              | Limit                                                                                               |
| ----------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `PRODUCTION_COPY_RECONCILIATION_RESULT.md`                  | MANUAL_REQUIRED | Production-copy schema can be inspected; receivables schema exists.                                         | Copy had 0 receivables rows and 6 legacy arrears rows; data backfill/allocation rules not approved. |
| `PRODUCTION_COPY_ROW_BACKFILL_007_RECONCILIATION_RESULT.md` | MANUAL_REQUIRED | Money and tenant/audit copy backfill can be dry-run separately.                                             | No receivables/events/allocations rows were inserted; lifecycle mapping remains manual.             |
| `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md`               | MANUAL_REQUIRED | Backend totals are comparable and P0-008 rows are isolated from backend totals authority comparison.        | Arrears outstanding remains blocked by P0-008 receivables.                                          |
| `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`                         | Defined         | Deposit, arrears paid/outstanding, refunds, and monthly income must remain distinct and integer-fils based. | KPI definitions and authority switch require approval.                                              |

## Rules Requiring Ramadan Confirmation

- Whether rent due should automatically create a receivable.
- Which business date controls due today and overdue.
- Whether short pay always leaves outstanding instead of discounting.
- Which receivable repayment should allocate to first.
- How overpayment should be recorded and whether it becomes credit/refund.
- Whether voided payments always restore active outstanding.
- Whether credit/debit adjustments require owner approval and audit evidence.
- Whether deposits are always liability until explicit refund, deduction, or
  approved offset.
- Whether dashboard due/overdue/arrears values may use receivables as authority.
- Whether production copy evidence is sufficient for production preflight input.

## Rules That Cannot Be Auto-Approved

- Production receivables migration/backfill has not been approved.
- Production receivables authority switch has not been approved.
- Production dashboard authority switch has not been approved.
- Production D1 backup, restore, and rollback are not final-approved.
- Adjustment credit/debit expected differences need explicit accounting
  acceptance.
- Deposit/refund/deduction semantics are liability-sensitive and need owner
  approval.
- Production-copy evidence is useful, but it is not production authorization.

## Production Status

Production remains `PRODUCTION_NO_GO`.

No production deploy, staging deploy, production migration, staging migration,
production D1 write, staging D1 write, production-copy D1 write,
D1 export/import/execute, business code change, dashboard change, financial
formula change, feature flag enablement, or cutover occurred.
