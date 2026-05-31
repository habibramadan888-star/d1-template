# Arrears Final Source Of Truth Contract

## Final Authority

`GET /api/arrears/followup/tasks` is the only source of truth for the owner arrears follow-up task pool.

The frontend is only responsible for:

- Fetching the SOT endpoint.
- Showing loading, skeleton, empty, error, partial-source warning, and retry states.
- Rendering preview and full task lists returned by the API.
- Rendering source labels and user-facing status labels.
- Handling view-all UI state.

The frontend must not:

- Merge arrears business sources.
- Read TTLock cards directly for arrears pool generation.
- Compute bed rent mapping.
- Compute arrears amount.
- Dedupe business rows.
- Compute source counts.
- Compute total amount.
- Create preview tasks by business rules.
- Decide whether missing-rent TTLock rows are official arrears.

## Backend Responsibilities

| Responsibility             | Backend Requirement                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Existing arrears           | Read and normalize existing arrears records from authoritative tables.                    |
| TTLock expired unpaid      | Read TTLock expired unpaid cards and convert only rent-configured beds into arrears rows. |
| Bed rent mapping           | Map TTLock beds to rent amount server-side.                                               |
| Amount authority           | Return amounts only from existing arrears amount or mapped bed rent amount.               |
| Source counts              | Return count per source.                                                                  |
| Total amount               | Return `total_amount_fils`.                                                               |
| Dedupe                     | Drop duplicate rows and return `dedupe_dropped_count`.                                    |
| Preview                    | Return `preview_tasks`.                                                                   |
| Full list / paginated list | Return `tasks` plus pagination metadata.                                                  |
| View all                   | Support `limit` / `offset` or equivalent pagination without frontend rebuilding.          |
| Missing rent config        | Return missing-rent count and non-public QA metadata, not official default cards.         |
| Partial source failure     | Return source-level `status` and `error_code`, while still returning available data.      |
| Source errors              | Do not force the frontend to infer backend source failures.                               |

## Required API Shape

```json
{
  "summary": {
    "total_count": 0,
    "total_amount_fils": 0,
    "existing_arrears_count": 0,
    "ttlock_expired_unpaid_count": 0,
    "promised_unpaid_count": 0,
    "config_missing_count": 0,
    "dedupe_dropped_count": 0
  },
  "preview_tasks": [],
  "tasks": [],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total_count": 0,
    "has_more": false
  },
  "sources": {
    "existing_arrears_record": {
      "count": 0,
      "status": "ok",
      "error_code": ""
    },
    "ttlock_expired_unpaid": {
      "count": 0,
      "status": "ok",
      "error_code": ""
    }
  }
}
```

## Current Contract Gap

Current backend already returns much of the required data, including `tasks`, `all_tasks`, `preview_tasks`, `summary`, `sources`, source counts, `source_status`, `ttlock_missing_rent`, and `has_more`.

Required cleanup:

- Add `summary.promised_unpaid_count` as the final name. Current related field: `employee_promised_count`.
- Add `summary.config_missing_count` as the final name. Current related field: `ttlock_missing_rent_count`.
- Move pagination into `pagination`.
- Keep legacy aliases temporarily for compatibility.
- Stop requiring frontend-side `buildArrearsFollowupPoolResult()` to recompute summary and preview.

## Source Rules

| Source                    | Included | Amount Source                  | Display Label  |
| ------------------------- | -------- | ------------------------------ | -------------- |
| `existing_arrears_record` | yes      | existing arrears record amount | 系统已有欠款   |
| `ttlock_expired_unpaid`   | yes      | server-side bed rent mapping   | 通通锁到期未付 |
| any other source          | no       | none                           | not displayed  |

## Frontend Rendering Contract

Each task returned by the backend must include enough user-facing fields for rendering:

- `task_id`
- `source_type`
- `room_bed` or equivalent display bed field
- `remain` and/or `amount_fils`
- `due_date`
- `followup_status`
- `promise_date` or `promised_payment_date`
- `staff_note` or `followup_note`
- `close_status`

The frontend may map labels but must not change business eligibility.
