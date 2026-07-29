# AUTH-ROUTING-STABILIZATION-001 Owner History Load Time Fix Result

Date: 2026-05-29, Asia/Dubai

| Requirement                   | Result                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Show loading within 300ms     | History still renders skeleton synchronously before the network request.                                                      |
| Load recent rows first        | First request remains limited to `HISTORY_PAGE_SIZE = 20`.                                                                    |
| Avoid 30s blank/skeleton wait | Added 8-second timeout with explicit retry card.                                                                              |
| Load more support             | Existing `加载更多历史` continues increasing the recent-row limit.                                                            |
| API pagination support        | Worker route supports `limit` and `offset`; UI currently uses incremental limit.                                              |
| Read-only history route       | GET `/api/history` and `/api/session_detail` no longer call `empEnsureSchema(env)`. They check table existence and read only. |
| Dashboard calculation change  | No.                                                                                                                           |
| Financial formula change      | No.                                                                                                                           |

If live D1 query latency remains high after this UI timeout, the next backend
task should add indexed production-safe pagination after explicit migration
approval. This task did not execute migration or D1 write.

Production status remains `PRODUCTION_NO_GO`.
