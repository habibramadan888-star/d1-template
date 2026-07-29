# P0-001G Live Write Adapter Rehearsal

Date: 2026-05-24, Asia/Dubai

Status: `Partial - employee entry live write adapter rehearsal passed`

## Scope

This task adds a local/staging-only adapter rehearsal for the legacy employee
entry write path. It targets the current live route shape for
`/api/employee/entry`, but it is not wired into the Worker route.

The adapter is intentionally non-invasive:

- It does not write D1.
- It does not modify `deploy-worker/src/index.js`.
- It does not execute production migration.
- It does not execute remote D1 migration.
- It does not deploy staging or production.
- It does not switch live dashboard results.
- It does not switch live employee handover behavior.
- It does not delete legacy decimal or `REAL` fields.

## Covered Entry Types

| Type | Meaning                    | Rehearsal Output                                         |
| ---- | -------------------------- | -------------------------------------------------------- |
| `R`  | rent collection            | `transactions`, `sessions`, optional `arrear_tasks` plan |
| `D`  | deposit collection         | `transactions`, `sessions`, `deposit_ledger` plan        |
| `DR` | deposit refund             | `transactions`, `sessions`, `deposit_ledger` plan        |
| `CO` | checkout deposit deduction | `transactions`, `sessions`, `deposit_ledger` plan        |
| `AP` | arrears payment            | `transactions`, `sessions`, `arrear_tasks` update plan   |
| `TF` | transfer fee               | `transactions`, `sessions` plan                          |
| `E`  | expense                    | `transactions`, `sessions` cash outflow plan             |

## Accounting Rules Rehearsed

- AED input must be string-parsed by the money helper and converted to integer
  fils.
- Three-decimal values are rejected.
- Numeric JS `Number` inputs are rejected as future accounting authority.
- Voided rows are excluded from active write planning.
- Rent short payment must explicitly create an arrear task plan with promise
  date and reason.
- Session cash handover is a cash delta:
  - inbound cash increases it;
  - deposit refunds and expenses decrease it;
  - checkout deposit deduction does not count as cash received.
- Gross received includes inbound receipts only and excludes refunds, expenses,
  and checkout deposit deductions.
- Frontend totals are not treated as authority.

## Evidence

- `modules/worker/employee-entry-live-write-adapter.mjs`
- `tests/employee-entry-live-write-adapter.spec.mjs`
- `scripts/rehearse-employee-entry-live-write-adapter.mjs`
- `P0_001G_LIVE_WRITE_ADAPTER_REHEARSAL_RESULT.md`
- `npm run test:employee-entry-live-write-adapter`
- `npm run rehearse:employee-entry-live-write-adapter`

## Verification Result

The rehearsal passed with 8 scenarios:

- rent full payment
- rent short payment with arrear task
- deposit collection
- deposit refund
- checkout deposit deduction
- arrears payment
- invalid three-decimal money rejection
- voided-row exclusion

The disposable local D1 table counts for `sessions`, `transactions`,
`deposit_ledger`, `arrears`, and `arrear_tasks` were unchanged before and after
adapter execution.

## Remaining Risk

P0-001 remains open. The live Worker still uses legacy decimal-compatible
write logic in `/api/employee/entry`, and the adapter is not yet wired into a
local/staging endpoint or live route.

## Next Gate

The next safe task is a local/staging-only route rehearsal or adapter-to-route
staging harness. It must remain feature-flagged, must not change production,
and must not switch live accounting authority until reconciliation and human
review are complete.
