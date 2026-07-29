# P0 Arrears Backend SOT Implementation Result

## Result

`GET /api/boss/arrears/followup-tasks` is now supported as the backend source-of-truth endpoint for owner arrears follow-up data. The legacy route `GET /api/arrears/followup/tasks` remains available as a compatibility alias.

## Contract Implemented

| Contract Area                         | Result                                                  |
| ------------------------------------- | ------------------------------------------------------- |
| `summary.total_count`                 | returned from backend merged task count                 |
| `summary.total_amount_fils`           | returned from backend amount aggregation                |
| `summary.existing_arrears_count`      | returned from backend source count                      |
| `summary.ttlock_expired_unpaid_count` | returned from backend source count                      |
| `summary.promised_unpaid_count`       | added; legacy `employee_promised_count` retained        |
| `summary.config_missing_count`        | added; legacy `ttlock_missing_rent_count` retained      |
| `summary.dedupe_dropped_count`        | added                                                   |
| `preview_tasks`                       | returned by backend from the first preview slice        |
| `tasks`                               | returned by backend as the current page                 |
| `all_tasks`                           | retained temporarily for compatibility                  |
| `pagination`                          | added with `limit`, `offset`, `total_count`, `has_more` |
| `sources.*.count/status/error_code`   | added                                                   |
| Partial source status                 | retained via `source_status`, normalized into `sources` |

## Safety

- D1 write: no
- Migration: no
- Business write: no
- Financial formula change: no
- Dashboard calculation change: no
- Production deploy: no
- Production cutover: `PRODUCTION_NO_GO`
