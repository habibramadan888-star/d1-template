# P0-006J Employee / Owner Access Scope Review

Date: 2026-05-26, Asia/Dubai

Scope: route/access policy verification after P0-006I2 staging backfill. This
review uses local/staging policy fixtures and does not wire live production
routes.

Commands:

```powershell
npm run test:tenant-scope-route-gate
npm run gate:tenant-scope-route-enforcement
```

Results:

| Check                         | Result | Evidence                                                | Notes                                                                                                    |
| ----------------------------- | ------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Route enforcement tests       | PASS   | `npm run test:tenant-scope-route-gate`, 8 tests passed  | Production disabled, staging flag behavior, owner/employee allow/deny matrix, rollback behavior covered. |
| Route enforcement gate script | PASS   | `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE_RESULT.md` | 11 scenarios passed, 0 blocked.                                                                          |

Access scope matrix:

| Scenario                                       | Expected | Result | Notes                                  |
| ---------------------------------------------- | -------- | ------ | -------------------------------------- |
| Owner reads own property history               | Allowed  | PASS   | Allowed by property membership.        |
| Owner reads another company history            | Denied   | PASS   | Denied by missing property membership. |
| Employee writes own property entry             | Allowed  | PASS   | Allowed by property membership.        |
| Employee writes another property entry         | Denied   | PASS   | Denied by missing property membership. |
| Employee accesses owner dashboard              | Denied   | PASS   | Denied by role.                        |
| Owner writes own company rent config           | Allowed  | PASS   | Allowed by property membership.        |
| Employee writes rent config                    | Denied   | PASS   | Denied by role.                        |
| Owner voids own session                        | Allowed  | PASS   | Allowed by property membership.        |
| Owner voids another company session            | Denied   | PASS   | Denied by missing property membership. |
| Employee submits staging handover own property | Allowed  | PASS   | Allowed by property membership.        |
| Owner submits staging handover                 | Denied   | PASS   | Denied by role.                        |

Safety:

- Production route wiring changed: no.
- Production auth behavior changed: no.
- Production deploy/migration/D1 write: no.
- Legacy `corpid` fallback removed: no.

Conclusion:

- Employee/owner access scope policy passes in local/staging gates.
- P0-006 remains Partial because production route/query wiring, migration, and
  human tenancy decisions are not complete.
