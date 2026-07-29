# P0-006J Cross-Tenant Leakage Review

Date: 2026-05-26, Asia/Dubai

Scope: local/staging policy verification after staging compatibility-column
backfill. No production URL was called and no D1 write was executed in this
verification task.

Commands:

```powershell
npm run test:tenant-scope
npm run test:tenant-scope-query-gate
npm run gate:tenant-scope-dashboard-history-query
```

Results:

| Check                               | Result | Evidence                                                      | Notes                                                                                                    |
| ----------------------------------- | ------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Cross-tenant fixture tests          | PASS   | `npm run test:tenant-scope`, 9 tests passed                   | Owner/employee access is scoped by company/property membership in fixtures.                              |
| Dashboard/history query gate tests  | PASS   | `npm run test:tenant-scope-query-gate`, 8 tests passed        | Production disabled, flag-off legacy behavior, flag-on staging gate behavior, rollback behavior covered. |
| Dashboard/history query gate script | PASS   | `TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE_RESULT.md` | 4 scenarios passed, 0 blocked, 6 cross-tenant rows removed from legacy `corpid` result.                  |

Cross-tenant leakage evidence:

| Scenario                                       | Expected                  | Result | Notes                                                          |
| ---------------------------------------------- | ------------------------- | ------ | -------------------------------------------------------------- |
| Owner A history query removes company B rows   | Cross-tenant rows removed | PASS   | Scoped query keeps owner A rows and removes company B rows.    |
| Owner B history query removes company A rows   | Cross-tenant rows removed | PASS   | Scoped query keeps owner B rows and removes company A rows.    |
| Owner A dashboard query removes company B rows | Cross-tenant rows removed | PASS   | Dashboard gate removes cross-tenant rows in staging gate mode. |
| Owner B dashboard query removes company A rows | Cross-tenant rows removed | PASS   | Dashboard gate removes cross-tenant rows in staging gate mode. |

Safety:

- Dashboard/history live result changed: no.
- Legacy `corpid` fallback removed: no.
- Production deploy/migration/D1 write: no.
- Production cutover: NO-GO.

Conclusion:

- No cross-tenant leakage was found in the local/staging query policy fixtures.
- This does not make production ready because live query wiring and production
  migration/backfill are still not approved.
