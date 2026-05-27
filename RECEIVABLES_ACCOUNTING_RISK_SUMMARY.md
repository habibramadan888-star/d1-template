# Receivables Accounting Risk Summary

Date: 2026-05-27, Asia/Dubai

Scope: production signoff support only. No production approval is granted by
this summary.

| Category                      | Risk Level | Evidence                                                                                                  | Remaining Decision                                                                                     | Production Impact                                                           |
| ----------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| rent lifecycle                | HIGH       | `RECEIVABLES_SOURCE_OF_TRUTH.md`; `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`                         | Confirm rent due creation, due today, overdue, and settlement rules.                                   | Wrong lifecycle rules can create or hide tenant debt.                       |
| arrears lifecycle             | HIGH       | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`; `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`  | Confirm arrears paid/outstanding and legacy comparison acceptance.                                     | Dashboard arrears authority remains NO-GO.                                  |
| repayment allocation          | HIGH       | `RECEIVABLES_SOURCE_OF_TRUTH.md`; P0-008E repayment scenarios                                             | Confirm allocation priority and repayment target rules.                                                | Incorrect allocation changes aging and outstanding balances.                |
| overpayment/refund            | HIGH       | `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`; `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`                      | Confirm overpayment, credit, refund, and separate-state rules.                                         | Overpayment may become incorrect credit, refund, or negative receivable.    |
| deposit liability             | BLOCKING   | `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; `RECEIVABLES_SOURCE_OF_TRUTH.md`; staging deposit exclusion evidence | Confirm deposit collection, refund, deduction, and offset policy.                                      | Deposits can be incorrectly counted as income or used to hide rent debt.    |
| void/correction               | HIGH       | P0-008E void and adjustment evidence                                                                      | Confirm voided payment restoration, credit/debit adjustment approval, and correction audit.            | Voids/corrections can alter outstanding balances incorrectly.               |
| dashboard authority           | BLOCKING   | `RECEIVABLES_DASHBOARD_AUTHORITY_GATE.md`; `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`          | Confirm whether receivables can become dashboard authority after preflight.                            | Live dashboard switch remains blocked until signoff.                        |
| history/reporting             | MEDIUM     | `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; audit/history relation notes                                         | Confirm history is display/audit, not accounting authority.                                            | Incorrect reporting source can mislead operations without changing ledgers. |
| production migration/backfill | BLOCKING   | `PRODUCTION_COPY_RECONCILIATION_RESULT.md`; `PRODUCTION_COPY_ROW_BACKFILL_007_RECONCILIATION_RESULT.md`   | Confirm whether receivables are deferred or included in production preflight/backfill.                 | Production migration cannot proceed without exact approved mapping.         |
| accounting review             | BLOCKING   | `MONEY_RISK_RAMADAN_REVIEW_CHECKLIST.md`; `RAMADAN_TOP_5_MONEY_DECISIONS.md`                              | Ramadan must decide receivables lifecycle, allocation, deposits, adjustments, and dashboard authority. | Commercial launch remains `PRODUCTION_NO_GO`.                               |

## Overall Assessment

Receivables evidence is strong enough for Ramadan review, but not for
production approval. The safest current status is `PENDING_REVIEW` for SO-010
and SO-011, with production still `PRODUCTION_NO_GO`.
