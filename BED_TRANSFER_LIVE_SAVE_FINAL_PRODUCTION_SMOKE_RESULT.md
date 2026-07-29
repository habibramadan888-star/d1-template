# Bed Transfer Live Save Final Production Smoke Result

Date: 2026-06-01
Worker Version ID: cc618def-9956-4489-860f-a18589ff362b

## Smoke Input

| Field | Value |
|---|---|
| from_bed | 144 |
| to_bed | 145 |
| transfer_date | 2026-06-01 |
| fee_mode | charged |
| amount_fils | 5000 |
| reason | customer_request |
| note | QA live save final smoke |

## Result

| Check | Result |
|---|---|
| Employee login usable | PASS |
| POST `/api/employee/bed-transfers` | PASS, HTTP 201 |
| status | recorded |
| fee_mode | charged |
| amount_fils | 5000 |
| review_flags saved | 3 |
| Owner login usable | PASS |
| Owner record visible | PASS |
| password/token/cookie printed | No |
| Set-Cookie printed | No |

Transfer ID: `bt-20260601-144-145-2a34a210`

## Production Write Scope

- One `bed_transfer_events` row.
- One `entry_events` ledger trace row.
- One audit anchor.
- One request idempotency anchor.

## No-Mutation Confirmation

Code path writes only Bed Transfer event, entry event, audit, and idempotency anchors.

No occupancy, deposit, arrears, TTLock, financial formula, or dashboard calculation mutation was added.

Production cutover remains PRODUCTION_NO_GO.
