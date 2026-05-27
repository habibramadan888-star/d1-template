# Ramadan Receivables Accounting Review Checklist

Date: 2026-05-27, Asia/Dubai

Owner: Ramadan Habib

Scope: manual business/accounting review only. This checklist does not approve
production deploy, production migration, production D1 write, dashboard switch,
or commercial cutover.

Production remains `PRODUCTION_NO_GO`.

## First-Pass Decision Record

| Item | Question for Ramadan                                             | Ramadan Decision                            | Reason Summary                                                                                   | Preflight Meaning                                                      | Production Status                    |
| ---- | ---------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------ |
| 1    | Should rent due automatically create a receivable?               | APPROVE                                     | Rent due should become a formal receivable so debt can be tracked.                               | Use automatic receivable creation as future-rule input.                | Not production cutover approval.     |
| 2    | Should short pay always leave an outstanding balance?            | APPROVE                                     | Short pay is not a discount; unpaid amount remains debt.                                         | Treat short pay as outstanding in preflight.                           | Not production cutover approval.     |
| 3    | Which receivable should repayment apply to first?                | APPROVE with oldest-due-first               | Oldest-due-first gives clear aging and arrears explanation.                                      | Use oldest-due-first allocation in preflight design.                   | Not production cutover approval.     |
| 4    | How should overpayment be handled?                               | APPROVE as separate credit/review item      | Extra payment should not create negative debt, deposit, or income automatically.                 | Close current receivable and hold excess as credit/manual-review item. | Not production cutover approval.     |
| 5    | Should voided payments restore outstanding debt?                 | APPROVE                                     | Invalid payments must not reduce receivable/outstanding.                                         | Restore outstanding when payment is voided/cancelled.                  | Not production cutover approval.     |
| 6    | Should deposits always stay out of rent income by default?       | APPROVE                                     | Deposits are liability/guarantee money, not rent income by default.                              | Keep deposits in deposit ledger and out of rent income.                | Not production cutover approval.     |
| 7    | How should deposit refund and deduction be handled?              | APPROVE as separate deposit ledger movement | Refunds/deductions reduce deposit liability; rent impact requires explicit offset/adjustment.    | Model refund/deduction in deposit ledger first.                        | Not production cutover approval.     |
| 8    | Which business date defines overdue?                             | APPROVE Dubai business date                 | UAE business operations should use Asia/Dubai business date.                                     | Use Dubai business date for due today/overdue logic.                   | Not production cutover approval.     |
| 9    | Should dashboard due/overdue/arrears be provided by receivables? | APPROVE for future authority only           | Receivables should eventually be dashboard authority, but only after all production gates close. | Use receivables as target future authority in preflight.               | Live dashboard switch remains NO-GO. |

## Remaining Review Items

| Item                             | Question for Ramadan                                                                                | Evidence File                                                                                           | If Approved Means                                                               | If Not Approved Means                                     | Current Status               |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Production receivables preflight | Should these Q1-Q9 decisions be used in the next production-copy/preflight planning packet?         | `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`; `RECEIVABLES_ACCOUNTING_RISK_SUMMARY.md`            | Codex can prepare copy/preflight mapping using the accepted rules.              | Keep receivables production preflight blocked.            | READY_FOR_PREFLIGHT_PLANNING |
| Production migration/backfill    | Should production SQL/backfill be prepared from these rules?                                        | `PRODUCTION_COPY_RECONCILIATION_RESULT.md`; `PRODUCTION_COPY_ROW_BACKFILL_007_RECONCILIATION_RESULT.md` | A later approval packet may define exact SQL, row counts, backup, and rollback. | No production receivables migration/backfill can proceed. | MANUAL_REQUIRED              |
| Dashboard authority switch       | Should the live dashboard switch to receivables after migration/backfill and rollback are approved? | `RECEIVABLES_DASHBOARD_AUTHORITY_GATE.md`; `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`        | A later cutover gate may propose exact flags and rollback.                      | Dashboard remains legacy.                                 | MANUAL_REQUIRED              |
| Rollback/correction              | Is rollback/correction acceptable for production receivables changes?                               | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`; `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`              | A later production preflight can define rollback triggers and restore method.   | Production remains blocked.                               | MANUAL_REQUIRED              |

## Required Ramadan Output For Future Tasks

For any future production task, Ramadan must still separately approve:

- Production D1 target.
- Fresh production backup.
- Exact production migration/backfill SQL.
- Exact row counts.
- Rollback method and owner.
- Feature flags and final states.
- Dashboard authority switch.
- Cutover window.

These Q1-Q9 decisions are accepted for production preflight input only.
