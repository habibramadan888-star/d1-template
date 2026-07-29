# Bed Transfer Production Smoke Save Result

Date: 2026-06-01 Asia/Dubai

## Approved Smoke Input

| Field | Value |
|---|---|
| from_bed | 144 |
| to_bed | 122 |
| transfer_date | 2026-06-01 |
| reason | Management adjustment |
| note | Internal production smoke for bed transfer. Verify deposit, arrears, TTLock trace, and occupancy statistics. |

## Persisted Event

| Field | Value |
|---|---|
| id | `bt-prod-smoke-20260601-144-122` |
| transfer_id | `bed-transfer-prod-smoke-20260601-144-122` |
| qa_tag | `qa-bed-transfer-prod-smoke-20260601-144-122` |
| status | `pending_review` |
| audit_id | `audit-bed-transfer-prod-smoke-20260601-144-122` |
| trace_id | `trace-bed-transfer-prod-smoke-20260601-144-122` |

## Write Scope

| Row Type | Written |
|---|---:|
| `bed_transfer_events` | 1 |
| `audit_logs` | 1 |
| `entry_events` | 1 |
| `transactions` | 0 |
| `arrear_tasks` | 0 |
| `deposit_ledger` | 0 |
| `app_settings` | 0 |

## Result

The one approved production smoke event was saved. It is intentionally `pending_review`; no real occupancy move was performed.
