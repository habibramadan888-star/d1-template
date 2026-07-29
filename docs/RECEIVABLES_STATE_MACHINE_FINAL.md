# Receivables State Machine Final Implementation Guide

Generated: 2026-05-29
Scope: definition and static audit only. No D1 write, no migration, no receivables formula change.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Tests/modules | `modules/finance/receivables.mjs` and `tests/receivables*.spec.mjs` define staging authority and BigInt-style receivable totals. | Strong staging design evidence. |
| Legacy live route | Worker still maps legacy `arrears`, `arrear_tasks`, and `transactions` with decimal fields. | Live cutover incomplete. |
| Auditability | `entry_events` and `handover_audit_events` exist. | Receivable-specific ledger authority still needs implementation proof. |

## States

| State | Meaning | Final |
|---|---|---|
| `CREATED` | Receivable created but not yet payment-ready. | No |
| `PENDING` | Full amount outstanding. | No |
| `PARTIAL` | Some payment allocated, outstanding remains. | No |
| `PAID` | Outstanding is zero. | Yes |
| `VOIDED` | Receivable voided with audit trail. | No, can restore only with approval |
| `RESTORED` | Previously voided receivable reopened. | No |
| `ADJUSTED` | Amount changed with approval and reason. | Yes unless policy reopens |
| `WRITTEN_OFF` | Finance-approved write-off. | Yes |

## Transition Rules

| From | To | Required Validation |
|---|---|---|
| `CREATED` | `PENDING` | Rent period active and amount positive. |
| `PENDING` | `PARTIAL` | Payment amount greater than zero and less than outstanding. |
| `PENDING` | `PAID` | Payment allocation covers outstanding. |
| `PARTIAL` | `PARTIAL` | Additional payment does not clear outstanding. |
| `PARTIAL` | `PAID` | Additional payment clears outstanding. |
| `PENDING/PARTIAL` | `VOIDED` | Approved void reason and audit event. |
| `VOIDED` | `RESTORED` | Approved restore reason and audit event. |
| `PENDING/PARTIAL` | `ADJUSTED` | Finance approval, old/new amount, reason. |
| `PENDING/PARTIAL` | `WRITTEN_OFF` | Finance approval, write-off reason. |

## Payment Allocation Rule

Payment allocation must be oldest-due-first:

1. Query receivables for the same tenant/customer where state is `PENDING` or `PARTIAL`.
2. Sort by `due_date ASC`, then `created_at ASC`.
3. Allocate payment to each receivable until the payment is exhausted.
4. If overpayment remains, create credit/manual review evidence instead of silently changing rent.
5. Record a ledger/audit event for every allocation.

## Exit Criteria

- All live receivable states are enforced by schema or backend validation.
- All state transitions create immutable audit evidence.
- Payment allocation uses integer fils and oldest-due-first.
- Legacy arrears comparison is available during staging shadow validation.
- Production cutover remains `PRODUCTION_NO_GO` until finance signs off.
