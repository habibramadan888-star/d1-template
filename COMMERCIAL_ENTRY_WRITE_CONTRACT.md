# Commercial Entry Write Contract

Date: 2026-05-23  
Status: design contract, not executable code  
Production deployment: not executed  
Production database mutation: not executed

## Purpose

This document defines the future server-side write sequence for employee rent entry. It is intentionally written before modifying `/api/employee/entry` so the accounting, audit, idempotency, and multi-tenant boundaries are reviewed first.

## Scope

Covered now:

- Employee rent collection entry.
- Partial payment and arrears-task creation.
- Session handover total recomputation.
- Audit event creation.

Not covered yet:

- Deposit collection.
- Deposit refund.
- Arrears repayment.
- Room transfer.
- Expense.
- Checkout.

Those event types need separate contracts before implementation.

## Required Request Context

The server must derive or verify these values. They must not be trusted only because the frontend sent them.

| Anchor                   | Source of truth                                                |
| ------------------------ | -------------------------------------------------------------- |
| `company_id`             | authenticated user session                                     |
| `property_id`            | authenticated property membership                              |
| `operator_id`            | authenticated employee user id                                 |
| `session_id`             | active draft handover session owned by the employee            |
| `bed_id`                 | server lookup from `beds` by `company_id/property_id/bed_code` |
| `bed_code`               | input bed matched against TTLock remark parser                 |
| `rent_config`            | active `bed_rent_config_versions` row                          |
| `ttlock_remark_snapshot` | latest TTLock card/remark payload                              |

## Validation Order

1. Authenticate request.
2. Verify role is employee, owner, or manager with write permission for the property.
3. Verify `company_id` and `property_id` are present on every query.
4. Reject if no active `property_memberships` row exists for the actor.
5. Verify handover session is `DRAFT` and belongs to the same operator/property.
6. Parse TTLock remark and reject staff beds or vacant beds.
7. Require input bed to match TTLock remark bed.
8. Resolve active bed and active rent config server-side.
9. Build rent entry draft with `createRentEntryDraft`.
10. Reject if short payment lacks arrears reason and promise date.
11. Reject if amount is not parsed as integer fils.

## Write Sequence

The following statements must run as one atomic write unit. If any step fails, none of the rows should be visible as committed business data.

1. Insert `transactions`.
2. Insert `receivables` for rent due.
3. Insert `payments` for the amount collected.
4. Insert `arrear_tasks` only when `shortfall_fils > 0`.
5. Insert `audit_events` for each business entity created.
6. Recompute the parent `handover_sessions` totals from accepted non-voided rows.
7. Update the parent `handover_sessions` summary fields.

If the storage layer cannot provide an atomic batch or equivalent all-or-nothing guarantee for this sequence, the route must not be promoted to production.

## Row Mapping

### `transactions`

| Column                 | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| `company_id`           | authenticated company                                |
| `property_id`          | authenticated property                               |
| `session_id`           | draft session                                        |
| `bed_id`               | resolved bed id                                      |
| `bed_code_snapshot`    | parsed bed or full TTLock remark where useful        |
| `tenant_name_snapshot` | full TTLock remark                                   |
| `event_type`           | `RENT`                                               |
| `payment_method`       | normalized `CASH` or `BANK`                          |
| `amount_fils`          | employee paid amount                                 |
| `due_fils`             | server-calculated period due                         |
| `paid_fils`            | amount applied to the receivable                     |
| `deficit_fils`         | due minus paid, minimum zero                         |
| `period_start`         | calculated period start                              |
| `period_end`           | calculated next due date or reviewed stored endpoint |
| `cycle`                | `1M`, `15D`, or `CUST`                               |
| `period_days`          | calculated billing days                              |
| `reason_code`          | arrears or adjustment reason when present            |
| `source`               | `EMP`                                                |
| `operator_id`          | authenticated actor                                  |

### `receivables`

Create one rent receivable per rent entry, even when fully paid. This preserves the accounting trail.

| Column                  | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| `source_transaction_id` | inserted transaction id                                      |
| `amount_due_fils`       | transaction due                                              |
| `amount_paid_fils`      | applied paid amount                                          |
| `amount_remaining_fils` | shortfall                                                    |
| `period_start`          | transaction period start                                     |
| `period_end`            | transaction period end                                       |
| `due_date`              | next due date or promised shortfall due date based on policy |
| `status`                | `PAID`, `PARTIAL`, or `OPEN`                                 |

### `payments`

Create one payment row for the collected amount. Zero-amount payments are not allowed.

| Column           | Value                       |
| ---------------- | --------------------------- |
| `session_id`     | draft session               |
| `transaction_id` | inserted transaction id     |
| `receivable_id`  | inserted receivable id      |
| `amount_fils`    | collected amount            |
| `payment_method` | normalized `CASH` or `BANK` |
| `operator_id`    | authenticated actor         |

### `arrear_tasks`

Create only when `amount_remaining_fils > 0`.

| Column                | Value                                                 |
| --------------------- | ----------------------------------------------------- |
| `receivable_id`       | inserted receivable id                                |
| `bed_id`              | resolved bed id                                       |
| `remaining_fils`      | receivable remaining amount                           |
| `followup_status`     | `PENDING`                                             |
| `promise_date`        | employee-entered promise date                         |
| `promise_amount_fils` | remaining amount unless explicitly approved otherwise |
| `staff_note`          | required reason/note when policy requires             |
| `assigned_to`         | operator id by default                                |

### `handover_sessions`

After inserting child rows, recompute totals from non-voided transaction/payment rows:

- `cash_handover_fils`
- `bank_transfer_total_fils`
- `bank_transfer_count`
- `gross_received_fils`

Frontend totals are display-only and must not be the source of truth.

### `audit_events`

At minimum create audit events for:

- transaction create,
- receivable create,
- payment create,
- arrear task create when present,
- handover summary recompute.

Audit payloads must include before/after JSON where applicable and actor role at event time.

## Idempotency

Every employee entry request must carry an idempotency key scoped by:

- `company_id`,
- `property_id`,
- `session_id`,
- `operator_id`,
- client entry id.

Duplicate requests with the same key must return the original committed result and must not create duplicate transactions, payments, receivables, or arrear tasks.

## Failure Rules

The server must reject and write no business rows when:

- authentication is missing,
- employee has no property membership,
- session is not `DRAFT`,
- bed cannot be resolved,
- TTLock remark bed mismatches input bed,
- TTLock remark indicates staff or vacant bed,
- rent config is missing,
- amount is not integer fils,
- short payment lacks reason or promise date,
- any inserted row would miss `company_id` or `property_id`,
- any money column would be stored as `REAL`, `FLOAT`, or JS floating-point derived value.

## Non-Goals

- This contract does not authorize production migration.
- This contract does not change the legacy Worker route.
- This contract does not change frontend behavior.
- This contract does not define deposit ledger behavior; deposit flows need a separate contract.
