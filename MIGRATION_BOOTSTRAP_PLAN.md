# Migration Bootstrap Plan

Date: 2026-05-23  
Status: design only  
Production migration: not executed  
Local migration: not executed

## Purpose

`npm run smoke:employee-entry` confirmed that a clean local D1 cannot accept the first employee entry because `transactions` is missing. A quick compatibility migration that creates `transactions` with `REAL` money fields would make the smoke test pass, but it would violate `AI_CONTRACT.md`.

This plan defines the commercial-safe migration direction. It is intentionally non-executable.

Field-level target schema is frozen in `MIGRATION_SCHEMA_CONTRACT.md`. If the plan and contract conflict, the contract is stricter.

## Non-Negotiable Constraints

- Do not add new commercial money columns as `REAL`.
- Do not rely on browser totals as accounting truth.
- Do not physically delete financial data in normal operations.
- Do not run production migration until local clean bootstrap and reconciliation tests pass.
- Do not migrate legacy data without a dry-run reconciliation report.

## Target Bootstrap Order

1. `schema_migrations`
2. `companies`
3. `properties`
4. `users`
5. `property_memberships`
6. `beds`
7. `bed_rent_config_versions`
8. `handover_sessions`
9. `transactions`
10. `receivables`
11. `payments`
12. `arrear_tasks`
13. `deposit_ledger`
14. `audit_events`
15. compatibility views or adapters for legacy owner/employee screens

## Table Design Principles

### `schema_migrations`

Required fields:

- `version`
- `name`
- `applied_at`
- `checksum`

Purpose:

- Prevent ad hoc schema mutation in request handlers.
- Track whether a clean D1 is ready.

### `companies`

Required fields:

- `company_id`
- `name`
- `status`
- `created_at`
- `updated_at`

Purpose:

- Future SaaS tenant root.

### `properties`

Required fields:

- `property_id`
- `company_id`
- `name`
- `timezone`
- `currency`
- `status`
- `created_at`
- `updated_at`

Purpose:

- Prevent all data from living under a single static `CORPID`.

### `users`

Required fields:

- `user_id`
- `company_id`
- `display_name`
- `role`
- `password_hash`
- `status`
- `created_at`
- `updated_at`

Purpose:

- Replace environment-only owner/staff credentials with scoped accounts.
- Production default credentials must not exist.

### `property_memberships`

Required fields:

- `membership_id`
- `company_id`
- `property_id`
- `user_id`
- `role`
- `status`
- `created_at`
- `updated_at`

Purpose:

- Allow one owner/staff account to be scoped to a property.

### `beds`

Required fields:

- `bed_id`
- `company_id`
- `property_id`
- `bed_code`
- `room_code`
- `status`
- `source`
- `created_at`
- `updated_at`

Purpose:

- Make bed identity stable instead of relying only on TTLock remark text.

### `bed_rent_config_versions`

Required fields:

- `config_id`
- `company_id`
- `property_id`
- `bed_id`
- `monthly_rent_fils`
- `half_month_rent_fils`
- `daily_rent_fils`
- `effective_from`
- `effective_to`
- `created_by`
- `created_at`

Purpose:

- Rent config must be versioned so historical receivables do not change when rent is edited.

### `handover_sessions`

Required fields:

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
- `voided_at`
- `voided_by`
- `void_reason`

Purpose:

- Backend must recompute all totals from accepted entries.
- Session submission should be atomic and idempotent.

### `transactions`

Required fields:

- `transaction_id`
- `company_id`
- `property_id`
- `session_id`
- `bed_id`
- `bed_code_snapshot`
- `tenant_card_id`
- `tenant_name_snapshot`
- `event_type`
- `payment_method`
- `amount_fils`
- `due_fils`
- `paid_fils`
- `deficit_fils`
- `currency`
- `period_start`
- `period_end`
- `cycle`
- `period_days`
- `reason_code`
- `source`
- `operator_id`
- `created_at`
- `voided_at`
- `voided_by`
- `void_reason`

Purpose:

- Replace floating transaction rows with integer-minor-unit accounting anchors.

### `receivables`

Required fields:

- `receivable_id`
- `company_id`
- `property_id`
- `bed_id`
- `tenant_card_id`
- `source_transaction_id`
- `amount_due_fils`
- `amount_paid_fils`
- `amount_remaining_fils`
- `period_start`
- `period_end`
- `due_date`
- `status`
- `created_at`
- `closed_at`

Purpose:

- Arrears should come from receivables, not just transaction shortfall side effects.

### `payments`

Required fields:

- `payment_id`
- `company_id`
- `property_id`
- `session_id`
- `transaction_id`
- `receivable_id`
- `amount_fils`
- `payment_method`
- `operator_id`
- `created_at`
- `voided_at`

Purpose:

- Payments apply to receivables and support partial repayment.

### `arrear_tasks`

Required fields:

- `task_id`
- `company_id`
- `property_id`
- `receivable_id`
- `bed_id`
- `tenant_card_id`
- `remaining_fils`
- `followup_status`
- `promise_date`
- `promise_amount_fils`
- `staff_note`
- `owner_note`
- `assigned_to`
- `created_at`
- `updated_at`
- `closed_at`

Purpose:

- Staff follow-up is a task layer, not the accounting source of truth.

### `deposit_ledger`

Required fields:

- `ledger_id`
- `company_id`
- `property_id`
- `tenant_card_id`
- `transaction_id`
- `delta_fils`
- `balance_after_fils`
- `movement_type`
- `operator_id`
- `created_at`
- `voided_at`

Purpose:

- Deposit is a liability ledger and must be audit-readable.

### `audit_events`

Required fields:

- `event_id`
- `company_id`
- `property_id`
- `actor_id`
- `actor_role`
- `entity_type`
- `entity_id`
- `event_type`
- `before_json`
- `after_json`
- `reason`
- `created_at`

Purpose:

- Unified immutable audit trail across financial and configuration changes.

## Compatibility Strategy

Phase 1:

- Keep existing Worker routes unchanged.
- Add tests that prove current clean bootstrap fails.
- Do not add compatibility `REAL` tables.

Phase 2:

- Add migration SQL for target tables.
- Add backend adapters that write integer fields first.
- Keep legacy read views only if necessary.

Phase 3:

- Backfill legacy rows into target tables with a dry-run reconciliation report.
- Compare old dashboard totals and new backend totals.

Phase 4:

- Switch employee entry to backend session commit.
- Switch owner dashboard to backend-calculated KPIs.

## Validation Gates

The migration is not acceptable until these pass locally:

- `npm run smoke`
- `npm run smoke:auth`
- `npm run smoke:employee-entry`
- amount conversion unit tests
- arrear creation and repayment tests
- deposit in/refund tests
- duplicate submit/idempotency tests
- owner dashboard reconciliation tests
- staff denial from owner APIs

## Explicit Non-Actions

- No production migration has been run.
- No local clean bootstrap has been altered by this document.
- No request-path `CREATE TABLE transactions` workaround is introduced.
- No new `REAL` commercial money fields are proposed.
