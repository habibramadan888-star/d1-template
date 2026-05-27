# Receivables Accounting Risk Summary

Date: 2026-05-27, Asia/Dubai

Scope: production signoff support only. No production approval is granted by
this summary.

Production remains `PRODUCTION_NO_GO`.

## Ramadan Decision Update

Q1-Q9 receivables/accounting rules are accepted for future rule direction and
production preflight input only. This reduces the accounting-rule ambiguity for
preflight, but does not approve production migration, production D1 write,
dashboard authority switch, or commercial cutover.

| Category                      | Risk Level After Decision | Evidence                                                                                                                                | Remaining Decision                                                                                                                             | Production Impact                                                                           |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| rent lifecycle                | MEDIUM                    | `RECEIVABLES_SOURCE_OF_TRUTH.md`; `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`; Ramadan Q1/Q2/Q5/Q8 decisions                        | Rules are accepted for preflight; production migration/backfill and authority switch still need approval.                                      | Wrong implementation could still create or hide tenant debt, so production remains gated.   |
| arrears lifecycle             | MEDIUM                    | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`; `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`; Ramadan Q2/Q5/Q8/Q9 decisions | Arrears future authority direction is accepted; exact production row mapping and dashboard cutover remain open.                                | Dashboard arrears authority remains NO-GO until production preflight and cutover approval.  |
| repayment allocation          | MEDIUM                    | `RECEIVABLES_SOURCE_OF_TRUTH.md`; P0-008E repayment scenarios; Ramadan Q3 decision                                                      | Oldest-due-first is accepted for preflight; production SQL/backfill must prove row-level behavior.                                             | Incorrect implementation could still change aging/outstanding balances.                     |
| overpayment/refund            | MEDIUM                    | `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`; `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; Ramadan Q4/Q7 decisions                           | Overpayment as separate credit/manual-review item and deposit ledger refund/deduction are accepted for preflight.                              | Production still needs exact ledger/receivable mapping and rollback.                        |
| deposit liability             | MEDIUM                    | `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; `RECEIVABLES_SOURCE_OF_TRUTH.md`; staging deposit exclusion evidence; Ramadan Q6/Q7 decisions      | Deposit is accepted as liability/deposit ledger by default; production dashboard formula and ledger migration remain gated.                    | Deposits must not be counted as rent income in production without explicit future approval. |
| void/correction               | MEDIUM                    | P0-008E void and adjustment evidence; Ramadan Q5/Q7 decisions                                                                           | Voided payments should restore outstanding; adjustments require explicit approval/audit.                                                       | Production implementation and rollback verification are still required.                     |
| dashboard authority           | BLOCKING                  | `RECEIVABLES_DASHBOARD_AUTHORITY_GATE.md`; `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`; Ramadan Q9 decision                   | Future receivables dashboard authority direction is accepted; immediate live switch is not approved.                                           | Live dashboard switch remains blocked.                                                      |
| history/reporting             | MEDIUM                    | `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; audit/history relation notes                                                                       | Q9 supports future dashboard direction, but history/reporting policy still needs production preflight review.                                  | Incorrect reporting source can mislead operations without changing ledgers.                 |
| production migration/backfill | BLOCKING                  | `PRODUCTION_COPY_RECONCILIATION_RESULT.md`; `PRODUCTION_COPY_ROW_BACKFILL_007_RECONCILIATION_RESULT.md`                                 | Decide whether receivables are deferred or included in production preflight/backfill, with exact SQL, counts, backup, and rollback.            | Production migration cannot proceed without exact approved mapping.                         |
| accounting review             | HIGH                      | `MONEY_RISK_RAMADAN_REVIEW_CHECKLIST.md`; `RAMADAN_TOP_5_MONEY_DECISIONS.md`; Ramadan Q1-Q9 decisions                                   | Receivables rule direction is accepted, but remaining money reconciliation, TOP_25, tenant mapping, rollback, and deploy signoffs remain open. | Commercial launch remains `PRODUCTION_NO_GO`.                                               |

## Overall Assessment

Receivables/accounting rule direction is now clear enough for production
preflight planning. It is not production approval.

Remaining blockers:

- Production receivables migration/backfill SQL and row counts are not approved.
- Production D1 backup and rollback are not approved.
- Production dashboard authority switch is not approved.
- P0-008 remains Partial.
- Commercial launch remains `PRODUCTION_NO_GO`.
