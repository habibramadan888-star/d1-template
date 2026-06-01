# Bed Transfer Production Smoke Final Result

Date: 2026-06-01 Asia/Dubai

## Summary

| Item | Result |
|---|---|
| Branch | `fix/auth-closure-001` |
| Input | `144 -> 122` |
| Production schema migration | PASS |
| One production Bed Transfer event smoke | PASS |
| Audit evidence | PASS |
| Trace evidence | PASS |
| Deposit mutation | NO |
| Arrears mutation | NO |
| TTLock mutation | NO |
| Occupancy/new tenant/checkout mutation | NO |
| Financial formula changed | NO |
| Dashboard calculation changed | NO |
| Broad internal write enabled | NO |
| Production cutover | PRODUCTION_NO_GO |

## Counts

| Count | Value |
|---|---:|
| requested_count | 1 |
| materialized_count | 1 |
| created_event_count | 1 |
| audit_count | 1 |
| trace_count | 1 |
| blocked_count | 0 for event-ledger smoke |
| transaction_rows_changed | 0 |

## Final Decision

The approved one-row production Bed Transfer event smoke passed as an event-ledger smoke.

Broad internal testing write capability was not enabled because the current employee UI is still gated and lacks a safe backend write adapter to `bed_transfer_events`.

Next recommended action: implement the dedicated Bed Transfer backend write adapter and owner event visibility before enabling employee-side internal write testing.

## Local Verification

| Command | Result |
|---|---|
| `npm run security:secrets` | PASS |
| `npm run gate:commercial-launch` | PASS, `PRODUCTION_NO_GO` |
| `npm run test:employee-bed-transfer-ui-fields` | PASS |
| `npm run test:bed-transfer-validation-service` | PASS |
| `npm run test:bed-transfer-accounting-rules` | PASS |
| `npm run test:bed-transfer-ttlock-migration` | PASS |
| `npm run test:bed-transfer-state-machine` | PASS |
| `npm run test:bed-transfer-traceability` | PASS |
| `npm run test:bed-transfer-statistical-anchors` | PASS |
| `npm run test:readonly-admin-role` | PASS |
