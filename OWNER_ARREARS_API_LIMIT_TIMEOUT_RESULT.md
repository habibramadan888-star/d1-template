# Owner Arrears API Limit Timeout Result

| API                                    | Has Limit                               | Timeout                 | Used By Overview       | Used By View All       |
| -------------------------------------- | --------------------------------------- | ----------------------- | ---------------------- | ---------------------- |
| `/api/arrears/followup/tasks?limit=5`  | yes                                     | within 10s total budget | yes                    | no                     |
| `/api/arrears?limit=5` fallback        | yes                                     | remaining 10s budget    | yes                    | no                     |
| `/api/arrears/followup/tasks?limit=20` | yes                                     | within 10s total budget | no                     | yes                    |
| `/api/arrears?limit=20` fallback       | yes                                     | remaining 10s budget    | no                     | yes                    |
| `/api/lock/cards?purpose=arrears_pool` | no row limit, background hydration only | 3s                      | non-blocking hydration | non-blocking hydration |

Backend limit support:

- `bossArrearsListLimit(request)` clamps `limit` from 1 to 100.
- `empListMergedArrearTasks(env, user, { limit })` applies SQL `LIMIT ?`.

Frontend:

- Overview uses `ARREARS_OVERVIEW_PAGE_SIZE=5`.
- View all uses `ARREARS_PAGE_SIZE=20`.
- TTLock aggregation is explicitly background-only and cannot block first paint.

Follow-up backend prompt: a future API-level summary endpoint can provide exact total amount/counts without requiring the overview to infer summary from loaded rows.
