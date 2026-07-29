# P0-008C Starting Context

Generated: 2026-05-25, Asia/Dubai

Scope: receivables local/staging rehearsal. No production deploy, production migration, production D1 write, staging D1 write, dashboard switch, or live financial formula change was executed.

## Current Legacy Behavior

1. Current `arrears` and `arrear_tasks` remain operational follow-up structures, not a full accounting source of truth.
2. Short pay can be represented by arrears/task rows, but there is no authoritative allocation ledger explaining exactly which payment reduced which obligation.
3. Dashboard due, overdue, and arrears totals are blocked by P0-008 because they need receivables status, due date, outstanding balance, and payment allocation authority.
4. Existing backend totals from P0-003 can recompute collected money, but they intentionally do not define what is owed.

## Design Readiness

| Question                                                          | Answer                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Is the receivables design sufficient for local/staging rehearsal? | Yes. `RECEIVABLES_MODEL_DESIGN.md`, `RECEIVABLES_LIFECYCLE_TEST_PLAN.md`, and P0-008B define enough scope for pure-module and fixture rehearsal. |
| Which fields must use fils?                                       | Receivable due, paid, outstanding, event amount, payment allocation, adjustment, dashboard due, overdue, arrears, and repayment totals.          |
| Which fields remain legacy?                                       | Existing `transactions`, `sessions`, `arrears`, and `arrear_tasks` decimal/text fields remain compatibility inputs only.                         |
| Does P0-008 depend on P0-001?                                     | Yes for production. Local/staging uses integer fils helpers now, but production cannot proceed until minor-unit reconciliation is approved.      |
| Does P0-008 depend on P0-003?                                     | Yes. Receivables will feed due/arrears authority, while P0-003 covers received totals; production needs both.                                    |
| Does P0-008 depend on P0-006?                                     | Yes. Production receivables must be tenant/property scoped before SaaS rollout.                                                                  |

## Minimum Safe Scope For P0-008C

| Area             | Scope                                                                                                                     | Production Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Pure module      | Build receivable drafts, allocations, events, adjustments, status, totals, and legacy comparison without database writes. | NO-GO             |
| Migration draft  | Add local/staging-only draft SQL with schema-only receivables tables.                                                     | NO-GO             |
| Tests            | Cover lifecycle, void, invalid money, deposit separation, adjustments, and frontend-total non-authority.                  | NO-GO             |
| Rehearsal script | Run fixture-driven dry-run by default and write a report.                                                                 | NO-GO             |
| Dashboard        | Produce future authority gate only; do not change live dashboard.                                                         | NO-GO             |

## Rehearsal-Only Boundary

- Production receivables tables were not created.
- Staging receivables tables were not created by this task.
- No existing legacy table was modified.
- No live dashboard result was changed.
- No production cutover was approved.
