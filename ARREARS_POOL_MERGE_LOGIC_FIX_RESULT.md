# ARREARS POOL MERGE LOGIC FIX RESULT

Only two sources remain in the owner arrears pool:

| Source                    | Included | Merge Rule                                                                                    | Count Owner                           |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| `existing_arrears_record` | yes      | Normalize system arrears / arrear task rows, filter open rows with positive remaining amount. | `summary.existing_arrears_count`      |
| `ttlock_expired_unpaid`   | yes      | Accept live/backend TTLock expired unpaid rows only when amount comes from bed-rent mapping.  | `summary.ttlock_expired_unpaid_count` |

Changes:

- Backend `/api/arrears/followup/tasks` now returns `summary`, `preview_tasks`, `all_tasks`, and `sources`.
- Frontend now builds `state.arrearsPoolResult` from the same merged array used by the rendered cards.
- Overview preview count and full list count now come from the same source.
- Deduplication remains source-aware via `sourceType|sourceRef`.

No D1 write, migration, financial formula change, dashboard calculation change, or tenant-scope change was performed.
