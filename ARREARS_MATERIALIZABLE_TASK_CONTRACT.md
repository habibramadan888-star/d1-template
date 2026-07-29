# Arrears Materializable Task Contract

Date: 2026-06-01, Asia/Dubai

Purpose: define one backend contract that lets owner SOT follow-up tasks become stable, persisted `arrear_tasks` rows before real employee directive dispatch.

## Supported Sources

| Field | existing_arrears | ttlock_expired_unpaid | Required |
|---|---|---|---|
| `stable_task_id` | existing `task_id` | SOT `ttlock-expired-*` ID, or deterministic source-derived ID | yes |
| `source_type` | `existing_arrears_record` | `ttlock_expired_unpaid` | yes |
| `source_ref` | existing `source_ref` or `task_id` | stable TTLock card/passcode/customer reference from SOT | yes |
| `room_bed` | task `bed` | TTLock mapped bed | yes |
| `customer_code` | tenant card/name if present | card/customer reference if present | optional |
| `amount_fils` | existing arrears amount | bed-rent-mapped amount | yes |
| `due_date` | existing task promise/original due date | TTLock card expiry due date | yes |
| `overdue_days` | derived | derived | yes |
| `status` | open follow-up status | `pending_followup` | yes |
| tenant/corp scope | `corpid` | `corpid` | yes |
| created source fingerprint | source/amount/bed/due/corp hash | source/amount/bed/due/corp hash | yes |
| idempotency scope | corp + source | corp + source | yes |

## TTLock Stable Source Rule

`source_type = ttlock_expired_unpaid`.

`source_ref` must come from stable TTLock SOT fields. The current implementation prefers the explicit SOT `source_ref`; if absent it derives:

```text
ttlock:{room_bed}:{due_date}:{amount_fils}:{card_or_customer_ref}
```

If there is no stable source reference, room/bed, due date, or amount, the backend returns `materialization_blocked` with `BLOCKED_TASK_ID_UNSTABLE` or `BLOCKED_MISSING_REQUIRED_FIELDS` before assignment.

## Safety Rule

Unstable TTLock rows must not be written to production. Materialization is required before directive assignment.
