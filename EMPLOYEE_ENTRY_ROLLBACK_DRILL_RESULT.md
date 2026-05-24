# Employee Entry Rollback Drill Result

Generated: 2026-05-24T23:39:19.916Z

Scope: P0-001K local-only rollback drill. This command uses disposable local D1 Workers only. It does not deploy, run production or remote migrations, change production config, or write secrets.

## Result

| Check                                                      | Result |
| ---------------------------------------------------------- | ------ |
| flag on adapter works                                      | PASS   |
| flag off returns legacy                                    | PASS   |
| adapter-only invalid check does not run with flag off      | PASS   |
| invalid flag-off request does not change dashboard/history | PASS   |

## Evidence

| Phase                   | Status | Adapter Metadata | Transaction Delta | History Changed | Notes                                                            |
| ----------------------- | -----: | ---------------- | ----------------: | --------------- | ---------------------------------------------------------------- |
| Flag on valid adapter   |    200 | DRAFT_READY      |                 1 | true            | Valid adapter rehearsal intentionally continues to legacy write. |
| Flag off valid legacy   |    200 | none             |                 1 | true            | Rollback path keeps current legacy behavior.                     |
| Flag off invalid legacy |    400 | none             |                 0 | false           | Adapter-only rejection is disabled when flag is off.             |

## Conclusion

PASS. Closing `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` returns `/api/employee/entry` to legacy behavior.
