# Ramadan Receivables Accounting Review Checklist

Date: 2026-05-27, Asia/Dubai

Owner: Ramadan Habib

Scope: manual business/accounting review only. This checklist does not approve
production.

| Item | Question for Ramadan                                                              | Evidence File                                                                                                                                              | If Approved Means                                                                             | If Not Approved Means                                                    | Suggested Status |
| ---- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------- |
| 1    | Should rent due automatically create a receivable?                                | `RECEIVABLES_SOURCE_OF_TRUTH.md`; `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`                                                                          | Production preflight may model rent due as a receivable obligation.                           | Keep production receivables authority blocked or change generation rule. | PENDING_REVIEW   |
| 2    | Should short pay always leave an outstanding balance?                             | `RECEIVABLES_LOCAL_STAGING_REHEARSAL_RESULT.md`; `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`                                                         | Partial payment is not treated as discount.                                                   | Define a separate discount/waiver policy before production.              | PENDING_REVIEW   |
| 3    | Which receivable should repayment apply to first?                                 | `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`; `RAMADAN_TOP_5_MONEY_DECISIONS.md`                                                                  | Allocation priority can be encoded for production preflight.                                  | Keep allocations manual or require a new policy rule.                    | PENDING_REVIEW   |
| 4    | How should overpayment be handled?                                                | `RECEIVABLES_SOURCE_OF_TRUTH.md`; local overpayment rehearsal                                                                                              | Overpayment stays separate from rent receivable and does not create negative arrears.         | Define refund/credit handling before production.                         | PENDING_REVIEW   |
| 5    | Should voided payments restore outstanding debt?                                  | P0-008E void impact evidence                                                                                                                               | Voided payments do not reduce active outstanding.                                             | Define alternate void/correction behavior before production.             | PENDING_REVIEW   |
| 6    | Should deposits always stay out of rent income by default?                        | `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`; `RECEIVABLES_SOURCE_OF_TRUTH.md`                                                                                      | Deposits remain liability unless an approved offset/deduction exists.                         | Dashboard and ledger formulas need policy changes before production.     | PENDING_REVIEW   |
| 7    | How should deposit refund and deduction be handled?                               | `MONEY_RISK_RAMADAN_REVIEW_CHECKLIST.md`; `RAMADAN_TOP_5_MONEY_DECISIONS.md`                                                                               | Refunds/deductions can be reviewed separately from rent income.                               | Deposit ledger and refund semantics stay production-blocking.            | PENDING_REVIEW   |
| 8    | Which business date defines overdue?                                              | `RECEIVABLES_SOURCE_OF_TRUTH.md`; P0-008E due/overdue evidence                                                                                             | Dubai business date can be used consistently for due/overdue.                                 | Timezone/date policy must be revised before authority switch.            | PENDING_REVIEW   |
| 9    | Should dashboard due/overdue/arrears be provided by receivables?                  | `RECEIVABLES_DASHBOARD_AUTHORITY_GATE.md`; `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`                                                           | Receivables may become dashboard authority only after production preflight and final signoff. | Dashboard remains legacy and P0-008 stays NO-GO.                         | PENDING_REVIEW   |
| 10   | Is current staging receivables evidence acceptable as production preflight input? | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`; `PRODUCTION_COPY_RECONCILIATION_RESULT.md`; `PRODUCTION_COPY_ROW_BACKFILL_007_RECONCILIATION_RESULT.md` | The team can prepare production-copy/preflight decisions using this evidence.                 | More staging evidence or remapping is required before preflight.         | PENDING_REVIEW   |

## Required Ramadan Output

For each item, record one of:

- `APPROVE`
- `KEEP_OPEN`
- `NEEDS_FIX`
- `NEEDS_ACCOUNTING_DECISION`
- `NOT_PRODUCTION_BLOCKING`
- `BLOCK_PRODUCTION`

Approving this checklist still does not authorize production deploy, production
migration, production D1 write, dashboard switch, or commercial cutover. Those
remain separate signoffs.
