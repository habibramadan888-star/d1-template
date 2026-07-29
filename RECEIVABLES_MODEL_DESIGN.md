# Receivables Model Design

Status: P0-008A design only. Production database mutation: not executed. Production Worker deployment: not executed.

## Purpose

The current system has `transactions`, `arrears`, and `arrear_tasks`, but it does not yet have a single accounting authority for what a tenant owes, what was paid, what remains, and why a balance changed. The commercial model needs `receivables` as the source of truth for rent and other billed obligations, with payments and adjustments allocated against those receivables.

This design does not change the live Worker, dashboard, rent formula, employee handover flow, or local bootstrap. It is a draft for the future P0-008 implementation.

## Proposed Tables

| Table                    | Purpose                                                                                              | Accounting Authority                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `receivables`            | One row per billable obligation, such as rent for a period, approved fee, or deposit-related charge. | Amount due, amount paid, remaining balance, status, period anchors.              |
| `receivable_events`      | Append-only lifecycle events for a receivable.                                                       | Audit trail for created, partially paid, settled, voided, adjusted, written off. |
| `payment_allocations`    | Links payments/transactions to receivables.                                                          | Explains exactly which payment paid which obligation.                            |
| `receivable_adjustments` | Approved non-payment changes to amount due or remaining balance.                                     | Discounts, waivers, owner approvals, deposit offsets, corrections.               |

## Receivables

Required fields:

| Field                   | Type                         | Rule                                                                     |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `receivable_id`         | `TEXT PRIMARY KEY`           | Stable generated id.                                                     |
| `company_id`            | `TEXT NOT NULL`              | Future tenant isolation.                                                 |
| `property_id`           | `TEXT NOT NULL`              | Property scope.                                                          |
| `bed_id`                | `TEXT`                       | Internal bed id when available.                                          |
| `bed_code_snapshot`     | `TEXT NOT NULL`              | Human-visible bed/remark snapshot at creation time.                      |
| `tenant_card_id`        | `TEXT`                       | TTLock CID snapshot if available.                                        |
| `tenant_snapshot`       | `TEXT`                       | Full TTLock remark snapshot; do not depend on mutable current card data. |
| `source_type`           | `TEXT NOT NULL`              | `RENT`, `DEPOSIT`, `TRANSFER_FEE`, `ADJUSTMENT`, `OTHER`.                |
| `source_id`             | `TEXT`                       | Originating handover entry, transaction, or system job.                  |
| `period_start`          | `TEXT`                       | Rent period start when applicable.                                       |
| `period_end`            | `TEXT`                       | Rent period end when applicable.                                         |
| `due_date`              | `TEXT NOT NULL`              | Business due date in Dubai calendar.                                     |
| `amount_due_fils`       | `INTEGER NOT NULL`           | Minor units only.                                                        |
| `amount_paid_fils`      | `INTEGER NOT NULL DEFAULT 0` | Sum of posted allocations.                                               |
| `amount_remaining_fils` | `INTEGER NOT NULL`           | `due - paid - approved adjustments`, never frontend authority.           |
| `status`                | `TEXT NOT NULL`              | `OPEN`, `PARTIAL`, `SETTLED`, `VOIDED`, `WRITTEN_OFF`.                   |
| `created_by`            | `TEXT NOT NULL`              | User/operator id.                                                        |
| `created_at`            | `TEXT NOT NULL`              | Server timestamp.                                                        |
| `updated_at`            | `TEXT NOT NULL`              | Server timestamp.                                                        |
| `voided_at`             | `TEXT`                       | Soft-delete/void timestamp.                                              |
| `voided_by`             | `TEXT`                       | User/operator id.                                                        |
| `void_reason`           | `TEXT`                       | Required for void.                                                       |

## Lifecycle

| Event               | Trigger                                                      | Required Result                                                                                             |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Rent due generated  | Employee rent entry or future scheduled billing job.         | Create `receivables` row with rent anchors and `OPEN` status.                                               |
| Full payment        | Paid amount equals amount due.                               | Create allocation, set `amount_paid_fils = amount_due_fils`, status `SETTLED`.                              |
| Short payment       | Paid amount is less than due and not approved as adjustment. | Create allocation, leave `amount_remaining_fils > 0`, status `PARTIAL`, create/refresh follow-up task.      |
| Repayment           | Employee records `还欠款 / ARREARS_REPAYMENT`.               | Allocate payment to oldest/selected open receivable, reduce remaining, close task when settled.             |
| Approved adjustment | Owner-approved discount/waiver/deposit offset.               | Create `receivable_adjustments`, reduce remaining without pretending cash was received.                     |
| Refund              | Deposit refund or cash outflow.                              | Does not reduce rent receivable unless explicitly approved as deposit offset; creates deposit ledger event. |
| Void                | Session/transaction void.                                    | Receivable stays stored, status `VOIDED`, allocations/events remain traceable.                              |
| Config change       | Rent config updated later.                                   | Existing receivable amount does not change; future receivables use effective-date config.                   |

## Relationship To Existing Tables

| Existing Table                   | Future Relationship                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `transactions`                   | Payment source. A transaction can allocate to one or more receivables.                                              |
| `deposit_ledger`                 | Deposit balance source. Deposit offsets require explicit adjustment event.                                          |
| `arrears` / `arrear_tasks`       | Operational follow-up view derived from open/partial receivables, not the accounting source.                        |
| `sessions` / `handover_sessions` | Batch acceptance source. Atomic handover should create transactions, receivables, allocations, and events together. |
| `bed_rent_config_versions`       | Receivable amount source at creation time, locked by effective date.                                                |
| `audit_logs` / `entry_events`    | Must reference receivable lifecycle events for traceability.                                                        |

## Accounting Rules

- Money must be stored in integer AED fils.
- Frontend amount/due/totals are display-only until backend validates them.
- A receivable is created before or together with a payment allocation, never after a dashboard summary.
- A short payment creates a remaining balance, not an implicit discount.
- A discount, waiver, or deposit offset is an adjustment with approver and reason.
- A void is not a delete. Voided receivables and allocations stay queryable by audit/reporting paths.
- Dashboard arrears should eventually read open `receivables`, not reconstruct debt from free-text tasks.

## Dependencies

| Dependency              | Why It Matters                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| P0-001 money precision  | Receivables must use integer fils from day one.                                                |
| P0-002 atomic handover  | Receivable creation and payment allocation must be accepted as one audited unit.               |
| P0-003 backend totals   | Dashboard totals should be recomputed from transactions/allocations, not staff browser totals. |
| P0-006 tenant isolation | Every receivable and allocation must be scoped by company/property/user membership.            |
| P1 Dubai timezone       | Due/overdue status must use Dubai business dates, not browser timezone.                        |

## Implementation Boundary

P0-008A is complete when design, migration draft, and lifecycle test plan exist. It is not complete enough for production. P0-008B must build local-only schema/tests. P0-008C must wire atomic handover writes. P0-008D must add reconciliation against legacy arrears before any production migration.
