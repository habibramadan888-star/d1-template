# Materialize Arrears Task From SOT Implementation Result

Date: 2026-06-01, Asia/Dubai

Implemented backend function: `materializeArrearsTaskFromSot(env, user, sotTask, options)`.

## Behavior Matrix

| Case | Behavior |
|---|---|
| existing persisted row | Reuses existing `arrear_tasks` row by `task_id` and `corpid`. |
| TTLock row already materialized | Reuses existing row by `(corpid, source_type, source_ref)`. |
| TTLock row new | Creates one `arrear_tasks` row with source metadata and amount from SOT bed-rent mapping. |
| duplicate request | `INSERT OR IGNORE` plus source unique index prevents duplicate materialized rows. |
| unstable source_ref | Blocks with `BLOCKED_TASK_ID_UNSTABLE` before assignment. |
| missing amount/bed/due date | Blocks with `BLOCKED_MISSING_REQUIRED_FIELDS`. |

## Safety Invariants

- Preserves `amount_fils` as `arrear_amount`.
- Sets `actual_received = 0` only on newly materialized TTLock rows.
- Does not modify `actual_received` on existing rows.
- Does not modify `accounting_status`.
- Does not close, void, or settle tasks.
- Does not write employee follow-up.
- Emits `entry_events` materialization evidence.
