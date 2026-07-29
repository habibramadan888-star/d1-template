# Bed Transfer Production TTLock Trace Verify

Date: 2026-06-01 Asia/Dubai

## Result

| Check | Result | Evidence |
|---|---|---|
| Old TTLock/card reference preserved | PASS | `old_ttlock_ref=139780080` |
| New TTLock/card reference auto-created | NO | `new_ttlock_ref=NULL` |
| New TTLock requires review | PASS | event `status=pending_review` |
| Trace row written | PASS | `entry_events.event_id=trace-bed-transfer-prod-smoke-20260601-144-122` |
| Audit row written | PASS | `audit_logs.id=audit-bed-transfer-prod-smoke-20260601-144-122` |
| TTLock production mutation | NO | no lock/card write endpoint or table mutation executed |

## Trace Linkage

| Field | Value |
|---|---|
| ref_id | `bt-prod-smoke-20260601-144-122` |
| ref_type | `bed_transfer` |
| event_type | `production_smoke` |
| old_value | `144` |
| new_value | `122` |

Production cutover remains `PRODUCTION_NO_GO`.
