# Owner Arrears Two Source Load Fix Result

Allowed sources:

| Source | Loads Independently | Failure Isolated | Included In Summary |
| --- | --- | --- | --- |
| `existing_arrears_record` | yes | yes | yes |
| `ttlock_expired_unpaid` | yes | yes | yes when rent mapping exists |

Implementation result:

- Existing arrears load from `/api/arrears/followup/tasks` and legacy `/api/arrears` fallback.
- TTLock expired unpaid cards load independently through `/api/lock/cards?purpose=arrears_pool`, then local rent mapping creates only valid arrears cards.
- `current_due_unpaid` is not an allowed independent third source.
- Unknown source rows are filtered by `isAllowedArrearsSource()`.
- Missing bed rent does not block the module and does not enter totals.
- If TTLock fails, existing arrears still render with a warning.
- If existing arrears fail, TTLock rows can still render with a warning.
