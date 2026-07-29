# IMPL-002 Receivables State Machine Backend Checklist

Generated: 2026-05-29
Scope: implementation handoff. No migration executed, no D1 write.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Staging receivables tests | `tests/receivables*.spec.mjs` cover due, overdue, partial, paid, adjustment, and void behavior. | Strong model coverage. |
| Current Worker legacy path | `arrears`, `arrear_tasks`, and `transactions` are still live-compatible legacy data paths. | Migration/cutover needed. |
| Money precision | Some legacy fields are decimal `REAL`; new authority must use integer fils. | Blocker until migration plan approved. |

## Required States

| State | Purpose |
|---|---|
| `CREATED` | Created but not payment-ready. |
| `PENDING` | Full amount outstanding. |
| `PARTIAL` | Partially paid. |
| `PAID` | Fully settled. |
| `VOIDED` | Voided with audit trail. |
| `RESTORED` | Reopened after void approval. |
| `ADJUSTED` | Approved accounting adjustment. |
| `WRITTEN_OFF` | Finance-approved write-off. |

## Required Backend Functions

- `transitionReceivableState(receivableId, targetState, context)`
- `allocatePaymentOldestDueFirst(customerId, paymentFils, context)`
- `recordReceivableLedgerEvent(event)`
- `validateReceivableTransition(fromState, toState, context)`

## Database Work Required

Do not run this until separately approved:

- Add or confirm receivable status fields.
- Add receivables ledger table.
- Add indexes for `(tenant_id, property_id, status, due_date)`.
- Add idempotency/audit linkage for payment allocation.

## Tests To Add Or Extend

- All valid transitions pass.
- Invalid transitions fail before write.
- Oldest-due-first allocation.
- Overpayment becomes explicit credit/manual review evidence.
- Void restores outstanding without deleting history.
- Written-off requires approval.
- Production cutover remains `PRODUCTION_NO_GO`.

## Exit Criteria

| Item | Required |
|---|---|
| State transition validation | Backend-enforced |
| Ledger event per transition | Yes |
| Money units | Integer fils |
| Live migration | Separate approval required |
| Production state | PRODUCTION_NO_GO until signed off |
