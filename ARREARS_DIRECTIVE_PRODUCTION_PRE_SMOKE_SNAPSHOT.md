# Arrears Directive Production Pre-Smoke Snapshot

Timestamp: 2026-05-31T20:47:26+04:00

Mode: production read-only snapshot. No write gate was enabled and no production D1 write was executed.

## Selected Task Snapshot

| Field | Value |
|---|---|
| task_id | `task-mpgzu9kp-f150e26f` |
| corpid | `homelink` |
| userid | `staff` |
| bed | `144` |
| tenant_card_id | `139780080` |
| tenant_name | `144 D200 0101` |
| arrear_amount | `50` |
| actual_received | `0` |
| close_status | null |
| directive_status | `none` |
| boss_requested_at | null |
| boss_requested_by | null |
| boss_requested_due_date | null |
| staff_promised_at | null |
| promise_date | `2026-05-24` |
| staff_note | existing value present |
| updated_by | `EMP` |
| updated_at | `2026-05-22T18:06:52+04:00` |

## Active Directive Snapshot

| Query | Result |
|---|---|
| selected task with active directive status | 0 rows |

## Idempotency Snapshot

| Idempotency Key | Result |
|---|---|
| `qa-prod-arrears-owner-20260531T203913-task-mpgzu9kp-f150e26f` | 0 rows |
| `qa-prod-arrears-employee-20260531T203913-task-mpgzu9kp-f150e26f` | 0 rows |

## Audit / Event Snapshot

| Table | Result |
|---|---|
| `audit_logs` matching task id | 0 rows |
| `entry_events` matching task id | 0 rows |

## Write Gate Snapshot

| Gate Secret | Present |
|---|---|
| `ARREARS_DIRECTIVE_WRITE_APPROVED` | no |
| `ARREARS_DIRECTIVE_WRITE_MODE` | no |

## Notes

- The task is a valid low-risk existing arrears candidate.
- The smoke was not executed because authenticated owner/employee runtime credentials are not available in the local environment.

