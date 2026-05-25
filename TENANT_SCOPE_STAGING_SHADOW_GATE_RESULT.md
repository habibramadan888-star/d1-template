# Tenant Scope Staging Shadow Gate Result

Generated: 2026-05-25T22:13:30.494Z

Scope: read-only staging/local tenant scope shadow gate. This script confirms the staging D1 target, reads table schema/counts with SELECT only, runs local cross-tenant fixture evidence, and does not deploy, migrate, write D1 rows, call production, mutate dashboard output, or change auth behavior.

Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)
Feature flag: `ENABLE_TENANT_SCOPE_SHADOW_STAGING`
Overall: `PASS`

| Area                       | Staging Source                                 | Shadow Scope                 | Result         | Notes                                                                                       |
| -------------------------- | ---------------------------------------------- | ---------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| active_sessions            | D1 table, rows=4                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| app_settings               | D1 table, rows=0                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| arrear_tasks               | D1 table, rows=7                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| audit_logs                 | D1 table, rows=7                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| deposit_ledger             | D1 table, rows=0                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| entry_events               | D1 table, rows=5                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| handover_audit_events      | D1 table, rows=3                               | company_id/property_id       | PASS           | Company/property columns exist and can participate in staging shadow comparison.            |
| handover_commit_rows       | D1 table, rows=2                               | company_id/property_id       | PASS           | Company/property columns exist and can participate in staging shadow comparison.            |
| handover_commits           | D1 table, rows=1                               | company_id/property_id       | PASS           | Company/property columns exist and can participate in staging shadow comparison.            |
| handover_idempotency_keys  | D1 table, rows=1                               | company_id/property_id       | PASS           | Company/property columns exist and can participate in staging shadow comparison.            |
| sessions                   | D1 table, rows=1                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| transactions               | D1 table, rows=3                               | legacy corpid                | LEGACY_WARNING | Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved. |
| local cross-tenant fixture | tests/fixtures/tenant-scope/local-staging.json | company/property memberships | PASS           | 7 scenarios, 0 leaks.                                                                       |
| dashboard live result      | not mutated                                    | shadow report only           | PASS           | No dashboard/history live response is switched by this gate.                                |
| production guard           | ENABLE_TENANT_SCOPE_SHADOW_STAGING             | production disabled          | PASS           | Production remains disabled even if the shadow flag input is true.                          |

Summary:

- Rows reviewed: 15.
- Blocked rows: 0.
- Manual-required rows: 0.
- Legacy-warning rows: 8.

Safety:

- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Production URL called: no.
- Staging D1 write: no.
- D1 command type: read-only SELECT.
- Production auth behavior changed: no.
- Legacy CORPID fallback removed: no.
- Dashboard/history live result changed: no.
- Secret/password/token/cookie printed: no.

Production meaning:

- P0-006 remains Partial, not Verified.
- Legacy `corpid` tables remain expected warnings, not production-ready scope.
- Production remains blocked until migration, backfill, live route enforcement, and human tenancy decisions are approved.
