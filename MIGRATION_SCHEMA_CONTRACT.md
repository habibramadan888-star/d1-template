# Migration Schema Contract

Date: 2026-05-23  
Status: contract draft, not executable SQL  
Production migration: not executed  
Local migration: not executed

## Purpose

This file turns `MIGRATION_BOOTSTRAP_PLAN.md` into a field-level contract for the next migration. It is not a migration file and must not be executed by Wrangler. Its job is to freeze the accounting and tenancy shape before code changes begin.

## Global Rules

- All commercial money fields use integer AED fils.
- Money column names must end with `_fils`.
- No new commercial table may use `REAL`, `FLOAT`, or browser-calculated money as the source of truth.
- Every business table has `company_id`.
- Every property-scoped business table has `property_id`.
- Every commercial record has `created_at`.
- Mutable business records have `updated_at`.
- Financial records are voided, not physically deleted.
- Timestamps are stored as ISO strings.
- Business dates use the property timezone, default `Asia/Dubai`.

## Status Values

| Area             | Values                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Business record  | `ACTIVE`, `VOID`, `ARCHIVED`                                                                   |
| Handover session | `DRAFT`, `SUBMITTED`, `EXPORTED`, `VOID`                                                       |
| Receivable       | `OPEN`, `PARTIAL`, `PAID`, `VOID`, `WAIVED`, `WRITTEN_OFF`                                     |
| Arrear task      | `PENDING`, `CONTACTED`, `PROMISED`, `PARTIAL_PAID`, `PAID`, `ESCALATED`, `UNREACHABLE`, `VOID` |

## Table Contracts

### `schema_migrations`

| Column       | Type | Required | Notes                   |
| ------------ | ---- | -------- | ----------------------- |
| `version`    | TEXT | yes      | primary key             |
| `name`       | TEXT | yes      | migration name          |
| `checksum`   | TEXT | yes      | migration file checksum |
| `applied_at` | TEXT | yes      | ISO timestamp           |

### `companies`

| Column       | Type | Required | Notes                |
| ------------ | ---- | -------- | -------------------- |
| `company_id` | TEXT | yes      | primary key          |
| `name`       | TEXT | yes      | company display name |
| `status`     | TEXT | yes      | `ACTIVE`, `ARCHIVED` |
| `created_at` | TEXT | yes      | ISO timestamp        |
| `updated_at` | TEXT | yes      | ISO timestamp        |

### `properties`

| Column        | Type | Required | Notes                 |
| ------------- | ---- | -------- | --------------------- |
| `property_id` | TEXT | yes      | primary key           |
| `company_id`  | TEXT | yes      | tenant scope          |
| `name`        | TEXT | yes      | property display name |
| `timezone`    | TEXT | yes      | default `Asia/Dubai`  |
| `currency`    | TEXT | yes      | default `AED`         |
| `status`      | TEXT | yes      | `ACTIVE`, `ARCHIVED`  |
| `created_at`  | TEXT | yes      | ISO timestamp         |
| `updated_at`  | TEXT | yes      | ISO timestamp         |

### `users`

| Column          | Type | Required | Notes                                       |
| --------------- | ---- | -------- | ------------------------------------------- |
| `user_id`       | TEXT | yes      | primary key                                 |
| `company_id`    | TEXT | yes      | tenant scope                                |
| `display_name`  | TEXT | yes      | staff or owner visible name                 |
| `role`          | TEXT | yes      | `owner`, `manager`, `staff`, future `admin` |
| `password_hash` | TEXT | yes      | no plaintext passwords                      |
| `status`        | TEXT | yes      | `ACTIVE`, `DISABLED`, `ARCHIVED`            |
| `created_at`    | TEXT | yes      | ISO timestamp                               |
| `updated_at`    | TEXT | yes      | ISO timestamp                               |

### `property_memberships`

| Column          | Type | Required | Notes                  |
| --------------- | ---- | -------- | ---------------------- |
| `membership_id` | TEXT | yes      | primary key            |
| `company_id`    | TEXT | yes      | tenant scope           |
| `property_id`   | TEXT | yes      | property scope         |
| `user_id`       | TEXT | yes      | account reference      |
| `role`          | TEXT | yes      | property-specific role |
| `status`        | TEXT | yes      | `ACTIVE`, `DISABLED`   |
| `created_at`    | TEXT | yes      | ISO timestamp          |
| `updated_at`    | TEXT | yes      | ISO timestamp          |

### `beds`

| Column                   | Type | Required | Notes                                   |
| ------------------------ | ---- | -------- | --------------------------------------- |
| `bed_id`                 | TEXT | yes      | primary key                             |
| `company_id`             | TEXT | yes      | tenant scope                            |
| `property_id`            | TEXT | yes      | property scope                          |
| `bed_code`               | TEXT | yes      | normalized bed code, no leading `#`     |
| `room_code`              | TEXT | no       | optional room code                      |
| `ttlock_remark_snapshot` | TEXT | no       | last full TTLock remark                 |
| `status`                 | TEXT | yes      | `ACTIVE`, `VACANT`, `STAFF`, `ARCHIVED` |
| `source`                 | TEXT | yes      | `TTLOCK`, `OWNER`, `IMPORT`             |
| `created_at`             | TEXT | yes      | ISO timestamp                           |
| `updated_at`             | TEXT | yes      | ISO timestamp                           |

### `bed_rent_config_versions`

| Column                 | Type    | Required | Notes             |
| ---------------------- | ------- | -------- | ----------------- |
| `config_id`            | TEXT    | yes      | primary key       |
| `company_id`           | TEXT    | yes      | tenant scope      |
| `property_id`          | TEXT    | yes      | property scope    |
| `bed_id`               | TEXT    | yes      | bed reference     |
| `monthly_rent_fils`    | INTEGER | yes      | monthly rent      |
| `half_month_rent_fils` | INTEGER | yes      | normally 40000    |
| `daily_rent_fils`      | INTEGER | yes      | normally 4000     |
| `effective_from`       | TEXT    | yes      | business date     |
| `effective_to`         | TEXT    | no       | null means active |
| `created_by`           | TEXT    | yes      | actor user id     |
| `created_at`           | TEXT    | yes      | ISO timestamp     |

### `handover_sessions`

| Column                     | Type    | Required | Notes                                    |
| -------------------------- | ------- | -------- | ---------------------------------------- |
| `session_id`               | TEXT    | yes      | primary key                              |
| `company_id`               | TEXT    | yes      | tenant scope                             |
| `property_id`              | TEXT    | yes      | property scope                           |
| `operator_id`              | TEXT    | yes      | staff user id                            |
| `business_date`            | TEXT    | yes      | property business date                   |
| `status`                   | TEXT    | yes      | `DRAFT`, `SUBMITTED`, `EXPORTED`, `VOID` |
| `cash_handover_fils`       | INTEGER | yes      | backend recomputed                       |
| `bank_transfer_total_fils` | INTEGER | yes      | backend recomputed                       |
| `bank_transfer_count`      | INTEGER | yes      | backend recomputed                       |
| `gross_received_fils`      | INTEGER | yes      | backend recomputed                       |
| `export_text`              | TEXT    | no       | generated text                           |
| `idempotency_key`          | TEXT    | yes      | prevents duplicate handover              |
| `created_at`               | TEXT    | yes      | ISO timestamp                            |
| `submitted_at`             | TEXT    | no       | ISO timestamp                            |
| `voided_at`                | TEXT    | no       | ISO timestamp                            |
| `voided_by`                | TEXT    | no       | actor user id                            |
| `void_reason`              | TEXT    | no       | required if voided                       |

### `transactions`

| Column                 | Type    | Required | Notes                                                                                   |
| ---------------------- | ------- | -------- | --------------------------------------------------------------------------------------- |
| `transaction_id`       | TEXT    | yes      | primary key                                                                             |
| `company_id`           | TEXT    | yes      | tenant scope                                                                            |
| `property_id`          | TEXT    | yes      | property scope                                                                          |
| `session_id`           | TEXT    | yes      | handover session                                                                        |
| `bed_id`               | TEXT    | no       | nullable for common expense                                                             |
| `bed_code_snapshot`    | TEXT    | no       | full bed or remark anchor                                                               |
| `tenant_card_id`       | TEXT    | no       | TTLock CID                                                                              |
| `tenant_name_snapshot` | TEXT    | no       | TTLock remark or tenant label                                                           |
| `event_type`           | TEXT    | yes      | `RENT`, `ARREAR_PAY`, `DEPOSIT_IN`, `DEPOSIT_REFUND`, `CHECKOUT`, `TRANSFER`, `EXPENSE` |
| `payment_method`       | TEXT    | no       | `CASH`, `BANK`, `NONE`                                                                  |
| `amount_fils`          | INTEGER | yes      | received or paid amount                                                                 |
| `due_fils`             | INTEGER | yes      | authoritative due for this entry                                                        |
| `paid_fils`            | INTEGER | yes      | applied paid amount                                                                     |
| `deficit_fils`         | INTEGER | yes      | due minus paid, minimum zero                                                            |
| `currency`             | TEXT    | yes      | default `AED`                                                                           |
| `period_start`         | TEXT    | no       | business date                                                                           |
| `period_end`           | TEXT    | no       | business date                                                                           |
| `cycle`                | TEXT    | no       | `1M`, `15D`, `CUST`, `FIRST_PRO`, `LAST_PRO`                                            |
| `period_days`          | INTEGER | no       | required for `CUST`                                                                     |
| `reason_code`          | TEXT    | no       | short code                                                                              |
| `source`               | TEXT    | yes      | `EMP`, `OWNER`, `SYS`, `IMPORT`                                                         |
| `operator_id`          | TEXT    | yes      | actor user id                                                                           |
| `created_at`           | TEXT    | yes      | ISO timestamp                                                                           |
| `voided_at`            | TEXT    | no       | ISO timestamp                                                                           |
| `voided_by`            | TEXT    | no       | actor user id                                                                           |
| `void_reason`          | TEXT    | no       | required if voided                                                                      |

### `receivables`

| Column                  | Type    | Required | Notes                   |
| ----------------------- | ------- | -------- | ----------------------- |
| `receivable_id`         | TEXT    | yes      | primary key             |
| `company_id`            | TEXT    | yes      | tenant scope            |
| `property_id`           | TEXT    | yes      | property scope          |
| `bed_id`                | TEXT    | yes      | bed reference           |
| `tenant_card_id`        | TEXT    | no       | TTLock CID              |
| `source_transaction_id` | TEXT    | yes      | originating transaction |
| `amount_due_fils`       | INTEGER | yes      | original due            |
| `amount_paid_fils`      | INTEGER | yes      | applied payments        |
| `amount_remaining_fils` | INTEGER | yes      | due minus paid          |
| `period_start`          | TEXT    | yes      | business date           |
| `period_end`            | TEXT    | yes      | business date           |
| `due_date`              | TEXT    | yes      | business date           |
| `status`                | TEXT    | yes      | receivable status       |
| `created_at`            | TEXT    | yes      | ISO timestamp           |
| `updated_at`            | TEXT    | yes      | ISO timestamp           |
| `closed_at`             | TEXT    | no       | ISO timestamp           |

### `payments`

| Column           | Type    | Required | Notes                                 |
| ---------------- | ------- | -------- | ------------------------------------- |
| `payment_id`     | TEXT    | yes      | primary key                           |
| `company_id`     | TEXT    | yes      | tenant scope                          |
| `property_id`    | TEXT    | yes      | property scope                        |
| `session_id`     | TEXT    | yes      | handover session                      |
| `transaction_id` | TEXT    | yes      | payment transaction                   |
| `receivable_id`  | TEXT    | no       | null only for non-receivable payments |
| `amount_fils`    | INTEGER | yes      | applied payment amount                |
| `payment_method` | TEXT    | yes      | `CASH`, `BANK`                        |
| `operator_id`    | TEXT    | yes      | actor user id                         |
| `created_at`     | TEXT    | yes      | ISO timestamp                         |
| `voided_at`      | TEXT    | no       | ISO timestamp                         |
| `voided_by`      | TEXT    | no       | actor user id                         |
| `void_reason`    | TEXT    | no       | required if voided                    |

### `arrear_tasks`

| Column                | Type    | Required | Notes                                   |
| --------------------- | ------- | -------- | --------------------------------------- |
| `task_id`             | TEXT    | yes      | primary key                             |
| `company_id`          | TEXT    | yes      | tenant scope                            |
| `property_id`         | TEXT    | yes      | property scope                          |
| `receivable_id`       | TEXT    | yes      | accounting source                       |
| `bed_id`              | TEXT    | yes      | bed reference                           |
| `tenant_card_id`      | TEXT    | no       | TTLock CID                              |
| `remaining_fils`      | INTEGER | yes      | copied from receivable for task display |
| `followup_status`     | TEXT    | yes      | staff workflow status                   |
| `promise_date`        | TEXT    | no       | required for overdue policy             |
| `promise_amount_fils` | INTEGER | no       | promised payment                        |
| `staff_note`          | TEXT    | no       | staff explanation                       |
| `owner_note`          | TEXT    | no       | owner instruction                       |
| `assigned_to`         | TEXT    | no       | staff user id                           |
| `created_at`          | TEXT    | yes      | ISO timestamp                           |
| `updated_at`          | TEXT    | yes      | ISO timestamp                           |
| `closed_at`           | TEXT    | no       | ISO timestamp                           |

### `deposit_ledger`

| Column               | Type    | Required | Notes                                                               |
| -------------------- | ------- | -------- | ------------------------------------------------------------------- |
| `ledger_id`          | TEXT    | yes      | primary key                                                         |
| `company_id`         | TEXT    | yes      | tenant scope                                                        |
| `property_id`        | TEXT    | yes      | property scope                                                      |
| `tenant_card_id`     | TEXT    | yes      | TTLock CID                                                          |
| `transaction_id`     | TEXT    | yes      | source transaction                                                  |
| `delta_fils`         | INTEGER | yes      | positive collection, negative refund or deduction                   |
| `balance_after_fils` | INTEGER | yes      | liability balance                                                   |
| `movement_type`      | TEXT    | yes      | `DEPOSIT_IN`, `DEPOSIT_REFUND`, `CHECKOUT_DEDUCTION`, `LEGACY_SEED` |
| `operator_id`        | TEXT    | yes      | actor user id                                                       |
| `created_at`         | TEXT    | yes      | ISO timestamp                                                       |
| `voided_at`          | TEXT    | no       | ISO timestamp                                                       |
| `voided_by`          | TEXT    | no       | actor user id                                                       |
| `void_reason`        | TEXT    | no       | required if voided                                                  |

### `audit_events`

| Column        | Type | Required | Notes                                                           |
| ------------- | ---- | -------- | --------------------------------------------------------------- |
| `event_id`    | TEXT | yes      | primary key                                                     |
| `company_id`  | TEXT | yes      | tenant scope                                                    |
| `property_id` | TEXT | no       | nullable only for company-wide settings                         |
| `actor_id`    | TEXT | yes      | user id                                                         |
| `actor_role`  | TEXT | yes      | role at event time                                              |
| `entity_type` | TEXT | yes      | table or entity name                                            |
| `entity_id`   | TEXT | yes      | affected id                                                     |
| `event_type`  | TEXT | yes      | `CREATE`, `UPDATE`, `VOID`, `SUBMIT`, `EXPORT`, `LOGIN`, `DENY` |
| `before_json` | TEXT | no       | before state                                                    |
| `after_json`  | TEXT | no       | after state                                                     |
| `reason`      | TEXT | no       | required for void or override                                   |
| `created_at`  | TEXT | yes      | ISO timestamp                                                   |

## Legacy Compatibility Map

| Legacy Concept                  | Target Concept                                           |
| ------------------------------- | -------------------------------------------------------- |
| `sessions`                      | `handover_sessions`                                      |
| `transactions.amount`           | `transactions.amount_fils`                               |
| `transactions.due`              | `transactions.due_fils`                                  |
| `transactions.paid`             | `transactions.paid_fils`                                 |
| `transactions.deficit`          | `transactions.deficit_fils`                              |
| `arrears`                       | `receivables` plus `arrear_tasks`                        |
| `arrear_tasks.arrear_amount`    | `arrear_tasks.remaining_fils` sourced from `receivables` |
| `deposit_ledger.amount`         | `deposit_ledger.delta_fils` and `balance_after_fils`     |
| `audit_logs` and `entry_events` | `audit_events`                                           |
| `CORPID`                        | `company_id`, then `property_id`                         |

## Migration Acceptance Criteria

- A new local D1 can be initialized without any request-path schema mutation.
- `transactions` exists before `/api/employee/entry` is called.
- `npm run smoke:employee-entry` passes against a clean local D1.
- No new migration introduces `REAL` for commercial money fields.
- Backend recomputes handover totals from accepted rows.
- Voiding a session preserves original rows and emits audit events.
- Staff role denial tests still pass.

## Explicit Non-Execution Statement

This document is not SQL. Do not copy it into `migrations/` as an executable migration. The next step must convert it into reviewed SQL migration files and tests in a separate change.
