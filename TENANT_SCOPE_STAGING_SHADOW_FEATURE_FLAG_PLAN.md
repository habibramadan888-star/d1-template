# Tenant Scope Staging Shadow Feature Flag Plan

Date: 2026-05-26, Asia/Dubai

Feature flag: `ENABLE_TENANT_SCOPE_SHADOW_STAGING`

| Env                    | Flag  | Expected Behavior                         |
| ---------------------- | ----- | ----------------------------------------- |
| production             | true  | disabled; production-safe legacy behavior |
| production             | false | disabled; production-safe legacy behavior |
| staging                | false | legacy behavior                           |
| staging                | true  | read-only tenant scope shadow mode        |
| local/development/test | true  | read-only tenant scope shadow mode        |
| missing APP_ENV        | any   | disabled; production-safe legacy behavior |

## Rules

- Production is always disabled, even if the flag input is `true`.
- Shadow mode must not mutate dashboard/history API responses.
- Shadow mode must not write D1 rows.
- Legacy `CORPID` fallback remains in place.
- Any future remote use must roll back by setting
  `ENABLE_TENANT_SCOPE_SHADOW_STAGING=false`.
- This flag does not approve production deploy, production migration, tenant
  backfill, or P0-006 verification.
