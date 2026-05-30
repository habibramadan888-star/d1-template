# Arrears Follow-up Data Model Final

Status: model draft only  
Migration: approval required, not executed

## Logical Table: `arrears_followup_tasks`

| Field                        | Type             | Purpose                                                           |
| ---------------------------- | ---------------- | ----------------------------------------------------------------- |
| `id`                         | text             | Stable task id                                                    |
| `tenant_id`                  | text             | Tenant scope                                                      |
| `property_id`                | text             | Property scope                                                    |
| `apartment_no`               | text             | Apartment grouping                                                |
| `room_bed`                   | text             | Room or bed identifier                                            |
| `customer_code`              | text             | Customer business code                                            |
| `card_code`                  | text             | TTLock/card fallback identifier                                   |
| `source_type`                | text             | `historical_arrears`, `current_due_unpaid`, `ttlock_expired_card` |
| `source_ref`                 | text/json        | Source object id or evidence payload                              |
| `package_code`               | text             | Package/rent reference                                            |
| `due_date`                   | text             | Due date anchor                                                   |
| `overdue_days`               | integer          | Calculated overdue days                                           |
| `expected_amount_fils`       | integer nullable | Expected amount in fils when available                            |
| `amount_authority_status`    | text             | `unknown`, `estimated`, `verified`                                |
| `followup_status`            | text             | Operational status                                                |
| `accounting_status`          | text             | Accounting status                                                 |
| `assigned_employee_id`       | text             | Responsible employee id                                           |
| `assigned_employee_name`     | text             | Display name snapshot                                             |
| `last_followup_at`           | text             | Last employee/owner follow-up timestamp                           |
| `next_promised_payment_date` | text             | Customer promise date                                             |
| `promised_amount_fils`       | integer nullable | Promised amount in fils                                           |
| `followup_note`              | text             | Latest operational note                                           |
| `risk_score`                 | integer          | Computed risk score snapshot                                      |
| `risk_level`                 | text             | `normal`, `watch`, `high_risk`, `blacklist_candidate`             |
| `repeat_arrears_count`       | integer          | Customer repeat count snapshot                                    |
| `promise_missed_count`       | integer          | Customer promise-missed count snapshot                            |
| `closed_at`                  | text nullable    | Close timestamp                                                   |
| `closed_by`                  | text nullable    | Closing actor                                                     |
| `close_reason`               | text nullable    | Required when closed                                              |
| `dedupe_key`                 | text             | Unique active task key                                            |
| `created_at`                 | text             | Created timestamp                                                 |
| `updated_at`                 | text             | Updated timestamp                                                 |

## Enumerations

`amount_authority_status`:

- `unknown`
- `estimated`
- `verified`

`accounting_status`:

- `unverified`
- `receivable_created`
- `payment_reported`
- `payment_matched`
- `closed`

`followup_status`:

- `discovered`
- `pending_followup`
- `contacted`
- `promised`
- `promise_overdue`
- `paid_reported`
- `needs_review`
- `false_positive`
- `moved_out`
- `closed`
- `voided`

## Non-execution Note

This file is a data model contract. No migration was executed and no D1 target was written.
