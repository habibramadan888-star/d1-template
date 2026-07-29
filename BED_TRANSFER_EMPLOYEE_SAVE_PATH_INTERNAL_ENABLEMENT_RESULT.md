# Bed Transfer Employee Save Path Internal Enablement Result

Date: 2026-06-01, Asia/Dubai

Decision: `enabled_for_internal_testing`

## Basis

| Evidence | Result |
|---|---|
| staging employee API E2E | PASS |
| production deploy | PASS |
| production one-row UI-originated API smoke | PASS |
| owner pending-review visibility | PASS |
| idempotency replay | PASS |
| no occupancy mutation | PASS |
| no deposit mutation | PASS |
| no arrears mutation | PASS |
| no TTLock mutation | PASS |
| commercial launch gate | `PRODUCTION_NO_GO` |

## Meaning

- Employees may submit Bed Transfer requests for internal testing.
- Requests save to `bed_transfer_events` as `pending_review`.
- Owner can review pending requests.
- The save path does not directly move beds.
- The save path does not mutate deposit, arrears, or TTLock records.
- Approve/reject handling remains a later implementation.
- This is not commercial launch approval.

Production cutover remains `PRODUCTION_NO_GO`.
