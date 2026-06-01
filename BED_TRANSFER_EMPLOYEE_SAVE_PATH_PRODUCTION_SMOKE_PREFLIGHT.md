# Bed Transfer Employee Save Path Production Smoke Preflight

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

## Selected Pair

| Check | Result |
|---|---|
| safe from_bed | `103` |
| safe to_bed | `111` |
| duplicate pending transfer for selected pair | `0` |
| any pending transfer on from_bed | `0` |
| any pending transfer on to_bed | `0` |
| from_bed active transaction anchors | `2` |
| to_bed active transaction anchors | `0` |
| occupancy mutation planned | no |
| deposit mutation planned | no |
| arrears mutation planned | no |
| TTLock mutation planned | no |
| production cutover | `PRODUCTION_NO_GO` |

The originally discussed `144 -> 122` pair was not used because a pending `144 -> 122` Bed Transfer already existed and `122` had active transaction anchors.

## Schema Readiness

| Schema Check | Result |
|---|---|
| `bed_transfer_events` | present |
| `audit_logs` | present |
| `entry_events` | present |
| `request_idempotency_keys` | present |

## Pre-Smoke Read-Only Snapshot

| Metric | Value |
|---|---:|
| selected pair existing event rows | 0 |
| selected pair pending rows | 0 |
| from_bed active transactions | 2 |
| to_bed active transactions | 0 |
| from_bed deposit balance cents | 0 |
| to_bed deposit balance cents | 0 |
| from_bed open arrears cents | 0 |
| to_bed open arrears cents | 0 |
