# P0-003B Starting Context

Scope: backend totals authority implementation rehearsal only. This task does not switch live dashboard totals, employee handover submission, Worker API responses, production D1 schema, or production deployment.

## Current Totals Provided By Frontend

| Total                     | Current Frontend Source                                                                            | Current Risk                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `cash_handover`           | Employee browser session summary in `employee-v3.html` and `deploy-worker/public/employee-v3.html` | Staff browser can become accounting authority if stored without backend recompute. |
| `bank_transfer_total`     | Employee browser reduction over local drafts                                                       | Bank total can be wrong after weak network, duplicate submit, or tampering.        |
| `bank_transfer_count`     | Employee browser count of bank rows                                                                | Count can diverge from accepted rows.                                              |
| `gross_received`          | Employee browser reduction before cash-out deductions                                              | Formula can drift from backend category policy.                                    |
| Export summary totals     | Employee browser export text                                                                       | Export can disagree with accepted backend rows if any entry fails.                 |
| Owner UI dashboard totals | `index-51-main.js` local reductions over history/session data                                      | Useful for display, but not safe as accounting authority.                          |

## Current Totals Computed By Backend

| Total                            | Current Backend Evidence                                    | Limitation                                             |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| Deposit balance                  | Worker sums legacy `deposit_ledger.delta` in selected paths | Uses legacy `REAL`; not integer-fils authority.        |
| Arrear task remaining            | Worker compares task amount and received in selected paths  | Operational task state, not formal receivable ledger.  |
| Delete-session active visibility | P0-004 filters voided rows from active reads                | Totals still need consistent void-aware recomputation. |
| Shadow handover totals           | `modules/finance/shadow-totals.mjs` and tests               | Not connected to live dashboard or handover response.  |
| Handover core totals             | `modules/finance/handover.mjs`                              | Pure module only; not live authority.                  |

## Current Totals Entering Database

| Table                      | Fields                                                                          | Authority Issue                                                    |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `sessions`                 | `cash_handover`, `bank_transfer_total`, `bank_transfer_count`, `gross_received` | Legacy `REAL` session totals can be submitted by frontend.         |
| `transactions`             | `amount`, `due`, `paid`, `deficit`, `period_due`, deposit fields                | Legacy decimal columns are row facts but not minor-unit authority. |
| `deposit_ledger`           | `amount`, `delta`, `balance_after`                                              | Deposit liability ledger uses legacy decimal fields.               |
| `arrears` / `arrear_tasks` | `remain`, `arrear_amount`, `promise_amount`, `actual_received`                  | Operational debt/task values can diverge from future receivables.  |
| `app_settings`             | rent JSON values                                                                | Rent config is JSON number based and lacks effective dates.        |

## Current Owner Dashboard Impact

Owner dashboard and history use a mixture of Worker-returned legacy rows and frontend reductions. The current UI can display useful summaries, but it is not yet proven that all dashboard core totals are backend-owned, void-aware, and integer-fils based.

## Handover Dependency

P0-002A requires a future atomic handover commit endpoint. That endpoint cannot become accounting-safe until P0-003 has backend recompute evidence for cash handover, bank transfer, gross received, and session totals.

## Receivables Dependency

P0-008A defines future receivables as the accounting source for due/outstanding amounts. P0-003B can rehearse current legacy arrears and task totals, but formal overdue/outstanding dashboard authority remains dependent on P0-008.

## Existing Shadow Coverage

| Existing Evidence                      | Coverage                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `tests/backend-totals-shadow.spec.mjs` | Recomputes handover summary from transaction rows and detects tampered submitted session total.                          |
| `modules/finance/handover.mjs`         | Defines cash, bank, gross, rent, deposit, arrears, transfer fee, deposit refund, and expense categories in integer fils. |
| `scripts/audit-backend-totals.mjs`     | Static scan finds frontend-submitted totals and numeric reductions.                                                      |
| `MONEY_SHADOW_VALIDATION_PLAN.md`      | Read-only money parsing/reconciliation approach.                                                                         |

## P0-003B Minimum Safe Scope

1. Create a non-invasive backend totals module that consumes row-like data and emits integer-fils totals, warnings, errors, and display strings.
2. Add fixtures for normal, voided, tampered, invalid, and edge cases.
3. Add unit tests proving backend totals do not trust frontend totals and exclude voided rows by default.
4. Add a local-only rehearsal script that applies clean local D1 migration into a disposable database, inserts representative legacy rows, recomputes totals, and writes a discrepancy report.
5. Update P0/P1 reports to `Partial - backend totals authority implementation rehearsal passed`.
6. Do not switch any live Worker route or dashboard output.
