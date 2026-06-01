# Bed Transfer Employee UI Write Staging E2E Result

Date: 2026-06-01
Status: NOT RUN IN THIS LOCAL STEP

## Reason

The employee UI and backend event-ledger path have been implemented and locally verified by static checks. Staging E2E requires deploying this Worker/UI build and using authenticated staging credentials.

## Required Staging E2E

| Check                            | Expected                              |
| -------------------------------- | ------------------------------------- |
| Employee TF save from 144 to 122 | Creates one `bed_transfer_events` row |
| Event status                     | `pending_review`                      |
| Audit row                        | Present                               |
| Trace row                        | Present                               |
| Idempotency replay               | Same response, no duplicate event     |
| Occupancy/deposit/arrears/TTLock | Unchanged                             |

## Current Safety Status

No staging write was executed by this documentation step.
