# Owner Dashboard Initial Load Review

Date: 2026-05-28, Asia/Dubai

## Review

| Area                   | Finding                                                                        | Action                                                            |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Auth bootstrap         | Legacy login panel rendered before `/api/me` completed.                        | Fixed by showing auth-loading first.                              |
| Owner shell            | `enterAs()` previously waited for all `loadAll()` data before showing the app. | Fixed by displaying the app shell before async data loads finish. |
| Slow APIs              | Customers, arrears, and room config can still be slow.                         | Leave formulas/API unchanged; optimize separately if needed.      |
| Dashboard calculations | No formula or result semantics changed.                                        | No action in this task.                                           |
| D1 writes              | No business write path touched.                                                | No D1 write approved or executed.                                 |

## Remaining Performance Work

The first usable shell should appear faster after this fix, but detailed
dashboard sections can still wait on backend reads. If the owner dashboard still
feels slow after deployment, use `NEXT_PROMPT_OWNER_DASHBOARD_LOAD_PERFORMANCE.md`.
