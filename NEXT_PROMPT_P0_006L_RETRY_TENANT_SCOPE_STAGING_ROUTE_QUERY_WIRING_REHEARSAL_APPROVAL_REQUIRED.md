# NEXT PROMPT: Retry P0-006L Tenant Scope Staging Route/Query Wiring Rehearsal

Current blocker: previous attempt stopped before runtime rehearsal because explicit approval flags were not supplied.

## Required Human Approval

To proceed, the user must explicitly approve all of the following:

- `--confirm-staging-tenant-scope-wiring`
- `--confirm-backup`
- `--confirm-rollback`
- `--confirm-auth-claim-review`
- `--confirm-legacy-corpid-fallback-preserved`

## Goal

Run a staging/local-only tenant scope route/query wiring rehearsal for approved P0-006K candidates.

Approved candidate areas:

1. `/api/employee/entry` POST.
2. `/api/staging/handover/commit` POST.
3. `/api/delete_session` POST.
4. `/api/rent_config` POST.
5. `/api/history` GET.
6. Owner dashboard active totals shadow/query scope.

## Strictly Forbidden

1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag enablement.
7. No production cutover.
8. No legacy CORPID fallback removal.
9. No dashboard live mutation without explicit staging-only gate.
10. No live financial formula change.
11. No secret commit.
12. No password/token/cookie output.
13. Do not mark P0-006 Verified.

## Required Rollback

After rehearsal, both flags must be false:

- `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING=false`
- `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING=false`

## Required Final Status

P0-006 may only become:

- `Partial - tenant scope staging route/query wiring rehearsal passed`

or:

- `Partial - tenant scope staging route/query wiring rehearsal blocked`

Production cutover must remain `NO-GO`.
