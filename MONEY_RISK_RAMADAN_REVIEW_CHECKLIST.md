# Money Risk Ramadan Review Checklist

Date: 2026-05-27, Asia/Dubai

Owner: Ramadan Habib

Scope: manual review checklist. This file does not approve production.

| Item | Question for Ramadan                                                                  | Evidence                                                                                                  | Recommended Decision                                                                                   | If Not Approved                                               |
| ---- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1    | Can ranks 1, 19, and 22 be closed as non-money static-scan hits?                      | `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md` shows they are lock sorting, date formatting, and pagination count. | Approve closure only if you agree these are not money authority.                                       | Keep them open and request scanner/risk-rule remediation.     |
| 2    | Do you accept the integer fils policy for production accounting authority?            | `MONEY_PRECISION_POLICY.md`; `MONEY_MIGRATION_PLAN.md`.                                                   | Approve policy direction, not production migration.                                                    | Block production money migration until policy is changed.     |
| 3    | Do you accept converting legacy sessions totals to fils for future backend authority? | `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md`; ranks 2-4.            | Pending review; approve only after exact production row counts and rollback are accepted.              | Keep backend totals authority NO-GO.                          |
| 4    | Do you accept converting legacy transaction rent/due/excess fields to fils?           | Ranks 5-7; `MONEY_DUAL_WRITE_MIGRATION_REVIEW.md`; `MONEY_RECONCILIATION_GATE_RESULT.md`.                 | Manual-required pending production SQL and accounting review.                                          | Block migration/backfill for these fields.                    |
| 5    | Do you accept deposit liability handling as separate from rent income?                | Ranks 8-11 and 16-18; `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; `RECEIVABLES_SOURCE_OF_TRUTH.md`.              | Manual-required; approve only if deposit, refund, and deduction semantics are accepted.                | Block deposit ledger backfill and dashboard authority switch. |
| 6    | Do you accept receivables/arrears lifecycle and allocation semantics?                 | Ranks 6-7, 12-15, 25; `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`.                                  | Manual-required; expected differences for adjustments must be accepted explicitly.                     | Keep P0-008 production authority NO-GO.                       |
| 7    | Are legacy numeric/decimal conversion warnings acceptable for production preflight?   | Ranks 20-21; warning behavior in staging/copy evidence.                                                   | Pending review; accept only if warnings remain explicit and reconciliation is zero-delta or explained. | Require data cleanup or stricter migration blockers.          |
| 8    | Is legacy deposit balance conversion acceptable as legacy-derived input only?         | Rank 23; deposit ledger migration plan.                                                                   | Pending review; approve only if final fils balance reconciliation is required before authority switch. | Keep deposit ledger authority blocked.                        |
| 9    | Is deposit movement parsing acceptable for copy/preflight only?                       | Rank 24; refund/outflow rules in backend totals source-of-truth.                                          | Pending review; approve only with explicit refund/movement accounting policy.                          | Require rewrite/remediation before production dry-run.        |
| 10   | Is employee entry amount parsing acceptable only behind adapter/cutover gates?        | Rank 25; employee-entry adapter evidence and money tests.                                                 | Pending review; approve only if live route switch remains gated and rollback exists.                   | Keep employee-entry production cutover NO-GO.                 |

## What Approval Means

Approving an item means accepting the documented review position for the next
production preflight step. It does not by itself approve production deploy,
production migration, production D1 write, feature flags, or cutover.

## What Rejection Means

Rejecting an item should create a remediation task. Production must remain
`PRODUCTION_NO_GO` until the rejected risk is fixed or explicitly scoped out by
a later approved decision.
