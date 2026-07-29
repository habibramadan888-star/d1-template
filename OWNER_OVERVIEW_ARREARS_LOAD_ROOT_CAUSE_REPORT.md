# Owner Overview Arrears Load Root Cause Report

Status: fixed in code; pending authenticated mobile screenshot acceptance.

Root cause classification:

- AGGREGATION_TOO_SLOW
- FRONTEND_TIMEOUT_TOO_SHORT
- TTLOCK_SOURCE_BLOCKING
- RENT_MAPPING_ERROR

The timeout was not only a UI problem. The owner overview called the arrears API, and that API used the same merged task helper as write-oriented flows. The helper started with `empEnsureSchema()`, so a read-only dashboard request could pay runtime DDL/index-check cost before returning data. The frontend then treated the system arrears source and TTLock hydration as one logical load path, so slow/missing TTLock data or rent mapping could collapse the whole module into a generic timeout state.

| Step | API / Function | Expected | Actual | Duration | Root Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/arrears/followup/tasks?limit=5` | Read-only, bounded query, contract fields returned | Called merged helper that started with schema ensure | Could exceed 10s under DDL/index/schema checks | AGGREGATION_TOO_SLOW | Added `empListMergedArrearTasksDetailed()` read-only path with no `empEnsureSchema()` or DDL |
| 2 | `empListMergedArrearTasks()` | Return existing arrears quickly | `arrear_tasks` and legacy `arrears` were not independently isolated | One table/query failure could fail the whole endpoint | API_500 / API_CONTRACT_MISMATCH | Each source query now has own try/catch and `source_status` |
| 3 | `loadHistoricalArrearsForOwner()` | Surface real failure class and fallback safely | Generic timeout could hide primary/fallback status | Up to timeout budget | FRONTEND_TIMEOUT_TOO_SHORT | Remaining budget is now real; fallback does not extend indefinitely |
| 4 | TTLock arrears hydration | Never block existing arrears display | TTLock was deferred inconsistently and could appear as whole-module failure | 3s timeout path | TTLOCK_SOURCE_BLOCKING | Existing and TTLock loads now run via `Promise.allSettled()` with partial rendering |
| 5 | Bed rent matching | Missing rent config excludes only that TTLock card | Missing rent could remove TTLock rows without clear isolation | Local computation | RENT_MAPPING_ERROR | TTLock missing rent remains source-local and does not block existing arrears |
| 6 | UI error | Diagnostic closure without technical leakage | Repeated “读取超时” with hidden root cause | User-visible loop | UNKNOWN masked as timeout | UI now shows recoverable failure and logs source status internally |

Conclusion:

- The primary root cause was read-path aggregation doing too much work and not isolating source failures.
- The secondary root cause was top-level frontend load semantics that treated source failures as module failure.
- The fix makes the API read-only, bounded, and diagnostic; the UI renders partial data if any allowed source succeeds.
