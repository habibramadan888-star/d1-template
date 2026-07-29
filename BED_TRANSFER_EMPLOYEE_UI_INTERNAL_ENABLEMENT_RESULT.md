# Bed Transfer Employee UI Internal Enablement Result

Date: 2026-06-01
Status: LOCAL IMPLEMENTATION READY

## Enabled Internally

- Employee TF form now has a real event-ledger save path.
- Owner can read pending-review event-ledger requests.
- Idempotency prevents duplicate submission with the same key.
- UI blocks stale TF drafts from handover export.

## Not Enabled

- No production cutover.
- No automatic occupancy move.
- No TTLock move.
- No deposit transfer mutation.
- No arrears clearing.
- No batch Bed Transfer.

## Gate Status

Production cutover remains `PRODUCTION_NO_GO`.
