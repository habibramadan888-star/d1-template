# Mixed Source Owner Directive Write API Result

Date: 2026-06-01, Asia/Dubai

Endpoint updated: `POST /api/boss/arrears/directives`.

## Supported Selected Inputs

| Input Type | Support |
|---|---|
| persisted `existing_arrears_record` task IDs | yes |
| TTLock virtual task IDs from boss SOT | yes, via materialization |
| mixed source array | yes |

## Processing Flow

1. Validate manager/owner role.
2. Validate production write gate.
3. Validate `idempotency_key`.
4. Resolve selected IDs against persisted `arrear_tasks` and current boss SOT.
5. Validate materialization contract for every selected task.
6. Block all writes if any selected task is missing or unstable.
7. Materialize TTLock virtual rows into `arrear_tasks`.
8. Assign persisted rows to the requested employee.
9. Skip already active assigned rows safely.
10. Record event/audit/idempotency evidence.

## Response Fields

| Field | Meaning |
|---|---|
| `requested_count` | number of selected IDs |
| `materialized_count` | new virtual rows persisted during request |
| `created_count` | rows newly assigned |
| `skipped_already_assigned_count` | active assigned rows reused/skipped |
| `blocked_count` | rows not assigned |
| `created_task_ids` | task IDs assigned in this request |
| `materialized_task_ids` | final persisted task IDs used |
| `blocked_reasons` | explicit reason list |

## All-Or-Nothing Guard

The API validates every selected ID before assignment. If any selected task is missing or unstable, it returns `materialization_blocked` and does not assign a partial batch.
