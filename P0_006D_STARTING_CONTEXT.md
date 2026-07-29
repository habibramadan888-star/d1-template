# P0-006D Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: tenant scope staging shadow gate. This task is staging/local only and
does not deploy, migrate, write D1 rows, call production, change production
auth, remove legacy `CORPID`, or mutate dashboard/history output.

## Prior Evidence

| Area                       | Evidence                                         | Current Result  | Notes                                                      |
| -------------------------- | ------------------------------------------------ | --------------- | ---------------------------------------------------------- |
| Readiness gate             | `TENANT_SCOPE_READINESS_GATE_RESULT.md`          | MANUAL_REQUIRED | Static `CORPID` remains the dominant live scope marker.    |
| Local/staging rehearsal    | `TENANT_SCOPE_LOCAL_STAGING_REHEARSAL_RESULT.md` | PASS            | Seven fixture scenarios passed with zero data leaks.       |
| Dashboard/history evidence | `P0_006C_DASHBOARD_HISTORY_EVIDENCE.md`          | PASS            | Fixture-based dashboard/history filtering is non-mutating. |
| Staging shadow comparison  | `TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md`     | PASS            | Staging D1 was read with SELECT only; no writes occurred.  |

## What P0-006C Proved

- Company/property membership helpers can deny cross-tenant dashboard and
  employee-entry access in local/staging fixtures.
- Same bed/CID values do not override company/property scope in fixture logic.
- Dashboard/history scope helper behavior is pure and non-mutating.

## What P0-006C Did Not Prove

- It did not inspect staging D1 schema/counts.
- It did not prove live Worker route enforcement.
- It did not migrate legacy `corpid` rows to `company_id` / `property_id`.
- It did not approve production SaaS tenant isolation.

## P0-006D Minimum Safe Scope

- Add a staging/local-only shadow guard:
  `ENABLE_TENANT_SCOPE_SHADOW_STAGING`.
- Read staging D1 schema/counts for scope-relevant tables with SELECT only.
- Keep dashboard/history live responses unchanged.
- Treat legacy `corpid` tables as warnings, not switch candidates.
- Keep P0-006 Partial, not Verified.

## Rollback Mechanism

No remote feature flag was enabled. Runtime rollback is therefore:

1. Keep `ENABLE_TENANT_SCOPE_SHADOW_STAGING=false`.
2. Preserve legacy `CORPID` fallback.
3. Keep dashboard/history live result on legacy behavior.
4. Do not run production deploy or production migration.
