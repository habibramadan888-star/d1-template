# P0-006L Rollback Result

Generated: 2026-05-26T13:16:18.485Z

Conclusion: `PASS`

| Flag                                                | Expected After | Actual After   | Result |
| --------------------------------------------------- | -------------- | -------------- | ------ |
| ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING       | false / LEGACY | false / LEGACY | PASS   |
| ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING | false / LEGACY | false / LEGACY | PASS   |

Rollback notes:

- Rehearsal used in-process env objects only.
- Remote staging flags were not changed.
- Final rehearsal state is false / legacy for both tenant-scope flags.
- Production untouched.
