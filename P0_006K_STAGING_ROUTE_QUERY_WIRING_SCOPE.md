# P0-006K Staging Route/Query Wiring Scope

Date: 2026-05-26, Asia/Dubai

Scope: local/staging-only tenant scope wiring readiness. No runtime Worker route was changed in this task.

| Route / Area                             | Current Behavior                                                 | Proposed Staging Wiring                                               | Required Flag                                         | Can Enter Staging Wiring Rehearsal | Production Switch | Blocker / Notes                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `/api/employee/entry` POST               | Legacy employee entry path remains live behavior.                | Add tenant/property authorization before accepted staging write.      | `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`       | yes                                | NO-GO             | Must preserve employee property membership and existing write guards.      |
| `/api/staging/handover/commit` POST      | Staging-only endpoint already protected by staging feature flag. | Add tenant/property authorization before staging handover acceptance. | `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`       | yes                                | NO-GO             | Production endpoint remains disabled.                                      |
| `/api/delete_session` POST               | Owner void path remains guarded by auth.                         | Add tenant/property authorization before voiding a scoped record.     | `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`       | yes                                | NO-GO             | Must not reintroduce hard delete.                                          |
| `/api/rent_config` POST                  | Owner write path remains legacy.                                 | Add owner membership scope before rent config writes.                 | `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`       | yes                                | NO-GO             | Effective-date rent config remains separate P1/P0 dependency.              |
| `/api/history` GET                       | Legacy query uses static deployment scope.                       | Add staging query scope by actor company/property membership.         | `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING` | yes                                | NO-GO             | Must preserve dashboard/history legacy output unless explicitly rehearsed. |
| Owner dashboard active totals            | Legacy active rows drive dashboard behavior.                     | Shadow scoped rows and compare against legacy result.                 | `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING` | yes                                | NO-GO             | No live dashboard card mutation in this gate.                              |
| `/auth/login` and `/auth/employee-login` | Auth/session behavior remains legacy-compatible.                 | Define membership claim source before live enforcement.               | n/a                                                   | no                                 | NO-GO             | MANUAL_REQUIRED.                                                           |
| `active_sessions` membership claims      | Existing sessions are compatibility-only.                        | Add reviewed claim propagation strategy.                              | n/a                                                   | no                                 | NO-GO             | MANUAL_REQUIRED.                                                           |
| Legacy CORPID fallback                   | Static `corpid` remains compatibility fallback.                  | Keep fallback until production migration/cutover approval.            | n/a                                                   | no                                 | NO-GO             | MANUAL_REQUIRED.                                                           |

## Gate Result

`TENANT_SCOPE_STAGING_WIRING_GATE=PASS`

Ready for future staging wiring rehearsal:

- `/api/employee/entry` POST
- `/api/staging/handover/commit` POST
- `/api/delete_session` POST
- `/api/rent_config` POST
- `/api/history` GET
- Owner dashboard active totals shadow/query scope

Manual-required before live wiring:

- Auth claim source and session membership shape.
- Active session compatibility propagation.
- Legacy CORPID fallback retirement plan.

Production remains `NO-GO`.
