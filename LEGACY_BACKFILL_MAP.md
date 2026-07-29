# Legacy Backfill Map

Date: 2026-05-23  
Status: design only  
Backfill executed: no  
Production database mutation: no

## Purpose

This document defines how existing legacy rows should be understood before any commercial backfill is written. It is not a migration script and must not be executed.

The goal is to prevent the dangerous path where old rows are copied into new SaaS/accounting tables without knowing which fields are accounting truth, which fields are display snapshots, and which fields are legacy compatibility artifacts.

## Global Backfill Rules

- Read legacy data first; never mutate legacy source rows during the first backfill pass.
- Convert all money to integer AED fils before writing commercial tables.
- Treat legacy `REAL` amounts as risky input and report rounding differences.
- Do not trust browser-provided totals as accounting truth.
- Do not physically delete commercial financial records during reconciliation.
- Every inserted commercial row needs `company_id`.
- Every property-scoped row needs `property_id`.
- Every generated row must be traceable to a legacy source row or a documented seed rule.
- Backfill must be idempotent.

## Required Legacy Inventory

Before writing any backfill code, inventory these tables from the source D1 copy:

| Legacy table     | Why it matters                                  | Commercial target                         |
| ---------------- | ----------------------------------------------- | ----------------------------------------- |
| `sessions`       | Employee/boss handover session envelope         | `handover_sessions`                       |
| `transactions`   | Main ledger rows, but uses legacy money shape   | `transactions`, `payments`, `receivables` |
| `arrears`        | Older arrear source from boss-side session save | `receivables`, `arrear_tasks`             |
| `arrear_tasks`   | Staff follow-up state                           | `arrear_tasks` linked to `receivables`    |
| `deposit_ledger` | Deposit liability movements                     | `deposit_ledger`                          |
| `entry_events`   | Employee-side event history                     | `audit_events`                            |
| `audit_logs`     | Owner/Worker audit history                      | `audit_events`                            |
| `employee_users` | Staff identity and status                       | `users`, `property_memberships`           |
| `app_settings`   | Rent config and operational settings            | versioned config/settings tables          |

## Mapping Details

### `corpid` To `company_id` / `property_id`

Legacy model:

- `corpid` is used as the broad tenant identifier.
- It is not enough for commercial SaaS because one company may later own multiple properties.

Commercial rule:

- Seed one reviewed default `company_id` and one reviewed default `property_id` for current legacy rows.
- Do not infer property from free text unless a manual mapping table exists.
- Future rows must use real `company_id` and `property_id`.

Risk:

- P0 if multiple properties already exist inside one `corpid` without a reliable mapping.

### `sessions` To `handover_sessions`

Legacy source fields:

- `id`
- `corpid`
- `anchor_id`
- `date`
- `entries_count`
- `created_by`
- `operator_id`
- `operator_name`
- `cash_handover`
- `bank_transfer_total`
- `bank_transfer_count`
- `gross_received`
- `handover_status`
- `exported_at`
- `export_text`
- `source`
- `created_at`

Commercial target fields:

- `session_id`
- `company_id`
- `property_id`
- `operator_id`
- `business_date`
- `status`
- `cash_handover_fils`
- `bank_transfer_total_fils`
- `bank_transfer_count`
- `gross_received_fils`
- `export_text`
- `idempotency_key`
- `created_at`
- `submitted_at`

Rule:

- Preserve the legacy totals as comparison inputs.
- Recompute commercial totals from accepted transaction/payment rows.
- If recomputed totals differ from legacy session totals, write a reconciliation exception.

### `transactions` To Commercial Accounting Rows

Legacy source includes:

- Identity: `id`, `corpid`, `userid`, `session_id`
- Target: `room`, `room_to`, `tenant_card_id`, `tenant_name`
- Classification: `cat`, `type`, `tag`, `src`, `pay_type`, `reason_code`
- Money: `amount`, `due`, `paid`, `deficit`, `list_price`, `period_due`, `excess`, `deposit_held`, `deposit_amt`, `deposit_deduction`, `ded_rate`, `promise_amount`
- Period: `period_start`, `period_end`, `cycle`, `period_day_count`, `start_date`, `due_date`, `dep_date`
- Arrear link: `linked_task_id`, `original_period_start`, `original_period_end`, `arrear_promise_date`, `arrear_reason_detail`
- Audit/operator: `operator_id`, `operator_name`, `ts`, `status`

Commercial targets:

- `transactions` for event snapshot.
- `payments` for actual money application.
- `receivables` for unpaid rent/arrear obligations.
- `deposit_ledger` only when the entry is a deposit movement.

Rule:

- Convert every money field to `_fils`.
- `amount_fils` is the submitted entry amount.
- `paid_fils` is the applied amount.
- `due_fils` is the authoritative due for the entry.
- `deficit_fils` becomes a receivable only when it represents a real unpaid obligation.
- `linked_task_id` should connect arrear repayment to the target receivable/task.

Risk:

- P0 because legacy rows mix event, payment, receivable, and deposit concepts in one table.

### `arrears` To `receivables` And `arrear_tasks`

Legacy source fields:

- `id`
- `corpid`
- `userid`
- `room`
- `note`
- `remain`
- `due_date`
- `type`
- `session_id`
- `entry_id`
- `cleared`

Commercial rule:

- If `cleared=0`, create or match an open `receivable`.
- Create an `arrear_task` only as the staff follow-up layer.
- If `cleared=1`, create a closed/paid reconciliation record only if matching payment evidence exists.

Risk:

- P1 because old arrears may not have enough period or tenant-card anchors.

### `arrear_tasks` To Commercial `arrear_tasks`

Legacy source fields:

- `task_id`
- `entry_id`
- `bed`
- `tenant_name`
- `tenant_card_id`
- `arrear_amount`
- `actual_received`
- `promise_date`
- `promise_amount`
- `followup_status`
- `close_status`
- `staff_note`
- `owner_note`
- `updated_by`
- `updated_at`

Commercial rule:

- Task amount is display/workflow context, not accounting truth.
- Accounting truth must come from `receivables.amount_remaining_fils`.
- Preserve staff promise and reason fields for future WiFi/collection policy.

### `deposit_ledger` To Commercial `deposit_ledger`

Legacy source fields:

- `ledger_id`
- `tenant_card_id`
- `tenant_name`
- `bed`
- `entry_id`
- `type`
- `amount`
- `delta`
- `balance_after`
- `operator_id`
- `ts`

Commercial rule:

- Convert `amount`, `delta`, and `balance_after` to fils.
- Recalculate balance per `tenant_card_id` ordered by timestamp.
- If recalculated balance differs from legacy `balance_after`, emit an exception.

Risk:

- P0 because deposit is a liability ledger and cannot be approximate.

### `entry_events` And `audit_logs` To `audit_events`

Commercial rule:

- Preserve every event where possible.
- Use `entity_type`, `entity_id`, `event_type`, `actor_id`, `actor_role`, `before_json`, `after_json`, `reason`, `created_at`.
- If actor or entity cannot be recovered, mark it as a reconciliation exception rather than inventing data.

### `employee_users` To `users`

Commercial rule:

- Migrate identity and display role only.
- Do not migrate local dev credentials into production.
- Require password reset or controlled credential provisioning for commercial rollout.

## Dry-Run Output Requirements

A future backfill dry-run must output:

- source row counts by legacy table,
- target row counts by commercial table,
- inserted/skipped/conflicted/failed counts,
- total legacy money by category,
- total target money by category,
- per-session total differences,
- per-bed receivable differences,
- per-tenant-card deposit differences,
- rows missing tenant/property scope,
- rows missing period anchors,
- rows missing staff/operator anchors,
- rows requiring manual review.

## No-Go Conditions

- Unknown money columns in legacy source.
- Unexplained difference between legacy totals and recomputed target totals.
- Missing default company/property seed mapping.
- Deposit balance mismatch without documented exception.
- Receivable row without period anchors.
- Backfill script not idempotent.
- No remote D1 backup plan.
- No rollback or restore procedure.
