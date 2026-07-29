# P0-008D Dashboard Receivables Authority Evidence

Generated: 2026-05-25, Asia/Dubai

Scope: dashboard future-authority evidence only. Live dashboard output was not changed.

| Dashboard Card / Value  | Receivables Shadow Result                                             | Current Evidence                                  | Production Status |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------------- | ----------------- |
| due today               | computable, but current staging data has no open due-today receivable | `NEEDS_MORE_DATA`                                 | NO-GO             |
| overdue amount          | computable, but current staging data has no overdue receivable        | `NEEDS_MORE_DATA`                                 | NO-GO             |
| arrears total           | computable, but current staging data has no arrears rows              | `NEEDS_MORE_DATA`                                 | NO-GO             |
| arrears outstanding     | computable, but needs open receivable/arrears staging data            | `NEEDS_MORE_DATA`                                 | NO-GO             |
| rent due                | MATCH for current staging shadow data                                 | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md` | NO-GO             |
| rent received           | MATCH for current staging shadow data                                 | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md` | NO-GO             |
| deposit handling        | MATCH; deposits are not rent receivables by default                   | `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md` | NO-GO             |
| void impact             | MATCH; active outstanding excludes voided rows                        | `tests/receivables-staging-shadow-gate.spec.mjs`  | NO-GO             |
| monthly income relation | shadow-only                                                           | Needs P0-001/P0-003/P0-008 accounting review      | NO-GO             |
| history relation        | shadow-only                                                           | No dashboard/history live mutation performed      | NO-GO             |

## Values Requiring More Staging Data

- due today open receivable.
- overdue open receivable.
- short-pay receivable.
- repayment/allocation.
- owner-approved credit/debit adjustment.
- voided payment against open receivable.

## Accounting Review Required

- Whether due today uses due date, period start, promise date, or configured billing date.
- Whether overpayment creates separate liability, credit, or refund workflow.
- Whether deposit offsets require explicit adjustment approval.
- Whether arrears paid is sourced from payment allocation or legacy repayment category.

## P0-006 Dependency

Production dashboard receivables authority needs tenant/property scope before launch because receivables must be filtered by company, property, room/customer, and authorized user membership.

## Rollback Plan

- Keep live dashboard on legacy source.
- Keep `ENABLE_RECEIVABLES_SHADOW_STAGING=false` unless running a future approved staging shadow rehearsal.
- If a future flag is enabled, set it back to `false` and verify dashboard remains legacy/unchanged.

Production remains `NO-GO`.
