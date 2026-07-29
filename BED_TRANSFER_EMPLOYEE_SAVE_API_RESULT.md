# Bed Transfer Employee Save API Result

Date: 2026-06-01
Status: IMPLEMENTED

## API

`POST /api/employee/bed-transfers`

## Required Payload

| Field             | Required | Notes                                    |
| ----------------- | -------- | ---------------------------------------- |
| `from_bed`        | yes      | Original bed.                            |
| `to_bed`          | yes      | Target bed. Must differ from `from_bed`. |
| `transfer_date`   | yes      | ISO date.                                |
| `reason`          | yes      | Employee-selected transfer reason.       |
| `note`            | yes      | Employee note / operator context.        |
| `idempotency_key` | yes      | Header `Idempotency-Key` or body field.  |

## Write Scope

| Table                      | Write | Purpose                             |
| -------------------------- | ----: | ----------------------------------- |
| `bed_transfer_events`      |   yes | Event ledger with `pending_review`. |
| `entry_events`             |   yes | Trace row.                          |
| `audit_logs`               |   yes | Audit event.                        |
| `request_idempotency_keys` |   yes | Replay/conflict protection.         |
| `transactions`             |    no | Occupancy must not mutate.          |
| `deposit_ledger`           |    no | Deposit amount must not mutate.     |
| `arrear_tasks`             |    no | Arrears must not mutate or clear.   |
| TTLock API                 |    no | Lock/card must not mutate.          |

## Response

Returns standard response with `status: pending_review`, `review_required: true`, and transfer/audit/trace references.
