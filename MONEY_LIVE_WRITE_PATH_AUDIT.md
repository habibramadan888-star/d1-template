# Money Live Write Path Audit

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001F gate only. No live write path was changed. No production migration, remote D1 migration, staging deploy, production deploy, dashboard switch, handover switch, or legacy field deletion was performed.

## Current Live Write Paths

| Area                      | File / Lines                                              | Current Behavior                                                                                                                                                                                          | Money Authority Risk                                                                                            | Required Before Switch                                                                                                            |
| ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Employee entry            | `deploy-worker/src/index.js:1416`                         | `/api/employee/entry` parses `amount`, `due`, `paid`, `period_due`, deposit fields, and promise amounts with `Number(...)`, then writes `sessions`, `transactions`, `deposit_ledger`, and `arrear_tasks`. | P0. This is a live staff financial write path and still stores legacy decimal/REAL-compatible values.           | Local/staging write adapter rehearsal, dual-write `*_fils` patch plan, backend recompute, idempotency, audit, reconciliation.     |
| Deposit ledger move       | `deploy-worker/src/index.js:1282`                         | `empDepositMove` sums `deposit_ledger.delta`, rounds decimal balances, then inserts ledger rows.                                                                                                          | P0. Deposit liability balance can drift if decimal rounding and negative deltas are not integer-fils authority. | Ledger invariant tests, negative delta policy, `amount_fils`, `delta_fils`, `balance_after_fils`, running-balance reconciliation. |
| Arrear reconciliation     | `deploy-worker/src/index.js:1301`                         | `empReconcileArrearTask` sums `transactions.amount`, updates `arrear_tasks.actual_received`, and updates legacy `arrears.remain`.                                                                         | P0. Arrears and repayment totals are derived from legacy decimal sums and are not formal receivables.           | P0-008 receivables decision, backend allocation rules, `actual_received_fils`, `remain_fils`, zero-delta reconciliation.          |
| Arrear task update        | `deploy-worker/src/index.js:1769`                         | Manager/staff update `arrear_amount`, `promise_amount`, and `actual_received` through `cleanMoney(...)` and dynamic SQL.                                                                                  | P0. Staff follow-up anchors and manager amount changes can remain decimal-only.                                 | Field-level dual-write adapter, role-specific validation, promise amount as follow-up anchor only, audit event coverage.          |
| Manager save session      | `deploy-worker/src/index.js:2603`                         | `/api/save_session` writes legacy manager batch sessions, transactions, and arrears using sanitized decimal values.                                                                                       | P0. Manager batch import remains a live financial authority path and uses `INSERT OR REPLACE`.                  | Decide whether this path is legacy-only, disabled, or adapted; add idempotency and backend totals before live minor-unit switch.  |
| Rent config JSON          | `deploy-worker/src/index.js:2429`, `2475`, `2536`, `2592` | `app_settings` stores JSON values and rent references with numeric rounding.                                                                                                                              | P1. Rent configuration values feed future due calculations but are not a payment row by themselves.             | Effective-dated rent config model and integer-fils rent values; separate task before commercial production.                       |
| Delete session void       | `deploy-worker/src/index.js:2704`                         | `/api/delete_session` marks sessions, transactions, deposit ledger rows, arrears, and tasks as voided.                                                                                                    | P1. This is an allowed void path after P0-004; it must remain non-destructive.                                  | Keep hard-delete tests, ensure active totals exclude voided rows, ensure audit view can include voided rows.                      |
| Staging handover endpoint | `deploy-worker/src/index.js:2349` and staging handler     | `/api/staging/handover/commit` writes staging handover tables with backend recomputed fils totals.                                                                                                        | P2. It is not live authority while feature-flagged and production-disabled.                                     | Keep production 404, flag 403, owner/admin reject, legacy-table unchanged verification.                                           |

## Static Scan Evidence

`npm run audit:money-live-writes` generated `MONEY_LIVE_WRITE_PATH_AUDIT_RESULT.md`.

| Metric                                     | Result |
| ------------------------------------------ | -----: |
| Financial SQL write statements scanned     |     19 |
| P0 live decimal authority write statements |     10 |
| Money parsing / rounding patterns scanned  |     92 |

## Switch Order Recommendation

1. Do not start with production migration.
2. First create local/staging adapters around the highest-risk live paths without wiring them into production behavior.
3. Start with `/api/employee/entry` because it is the active staff write path, already has strong business validations, and directly writes transactions, deposit ledger rows, and arrear tasks.
4. Keep `/api/save_session` as a separate legacy-manager-path decision because it uses `INSERT OR REPLACE` and may be less aligned with the future atomic handover model.
5. Keep arrears/receivables production switch blocked until P0-008 defines receivables authority.

## Current Gate Result

P0-001 remains Partial. Live write paths are identified, but live minor-unit authority is not switched.
