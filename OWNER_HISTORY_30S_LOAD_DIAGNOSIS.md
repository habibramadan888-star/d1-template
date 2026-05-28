# AUTH-ROUTING-STABILIZATION-001 Owner History 30s Load Diagnosis

Date: 2026-05-29, Asia/Dubai

| Diagnostic Question                               | Finding                                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which API loads history?                          | Owner history calls `/api/history?limit=<N>` for the list and `/api/session_detail?id=<id>` for details.                                                                  |
| Which API is slow?                                | The user-reported delay is on history list load. The code had no client timeout, so a slow `/api/history` response could leave skeleton visible for 30 seconds or longer. |
| Does it load all history?                         | First load is limited to 20 rows, then load-more increases the limit.                                                                                                     |
| Does it wait for all data before rendering shell? | Shell/skeleton renders first, but final/error feedback waited for the fetch to finish.                                                                                    |
| Is pagination/limit present?                      | `limit` and `offset` are supported by the Worker route. UI uses limit-based recent-first loading.                                                                         |
| Is there frontend render blocking?                | No full DOM render before fetch returns; the visible issue is lack of timeout/retry feedback.                                                                             |
| Is there backend read-route DDL risk?             | `/api/history` and `/api/session_detail` called `empEnsureSchema(env)`, which is not appropriate for a read-only history path.                                            |

## Minimum Safe Fix

1. Keep immediate history skeleton.
2. Use `apiFetchWithTimeout()` with an 8-second timeout for history list/detail.
3. Show a visible timeout/retry card instead of waiting indefinitely.
4. Keep first load to recent 20 rows.
5. Replace read-route `empEnsureSchema(env)` with `empTableExists` checks for
   history/session-detail routes so GET history remains read-only.

Production status remains `PRODUCTION_NO_GO`.
