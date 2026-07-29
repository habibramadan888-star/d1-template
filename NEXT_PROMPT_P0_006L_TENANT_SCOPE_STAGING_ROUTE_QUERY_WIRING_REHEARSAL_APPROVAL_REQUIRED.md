# NEXT PROMPT: P0-006L Tenant Scope Staging Route/Query Wiring Rehearsal

Use this prompt only after human approval.

## Goal

Execute a staging/local-only tenant scope route/query wiring rehearsal for approved P0-006K candidates.

Approved candidate areas:

1. `/api/employee/entry` POST.
2. `/api/staging/handover/commit` POST.
3. `/api/delete_session` POST.
4. `/api/rent_config` POST.
5. `/api/history` GET.
6. Owner dashboard active totals shadow/query scope.

## Required Human Approval

The next task must require explicit approval before any runtime staging wiring or flag enablement:

- `--confirm-staging-tenant-scope-wiring`
- `--confirm-backup`
- `--confirm-rollback`
- `--confirm-auth-claim-review`
- `--confirm-legacy-corpid-fallback-preserved`

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

## Required Rehearsal Rules

1. Target only staging/local.
2. Keep production disabled.
3. Use feature flags:
   - `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`
   - `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING`
4. Roll both flags back to `false` after rehearsal.
5. Verify route allow/deny behavior.
6. Verify dashboard/history scoped query evidence.
7. Verify no cross-tenant leakage.
8. Verify no dashboard/history unapproved mutation.
9. Verify `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.
10. Keep P0-006 status Partial.

## Required Outputs

1. `P0_006L_PRE_REHEARSAL_CONFIRMATION.md`
2. `P0_006L_ROUTE_QUERY_WIRING_REHEARSAL_RESULT.md`
3. `P0_006L_DASHBOARD_HISTORY_SCOPE_EVIDENCE.md`
4. `P0_006L_ROLLBACK_RESULT.md`
5. `P0_006L_PRODUCTION_NO_GO_REVIEW.md`
6. Updated `RUN_REPORT.md`
7. Updated `VERIFICATION_STATUS.md`
8. Updated `COMMERCIALIZATION_BACKLOG.md`
9. Updated `P0_P1_STATUS_REVIEW.md`
10. Updated `NEXT_MORNING_REVIEW.md`

## Expected Final Status

P0-006 may only become:

- `Partial - tenant scope staging route/query wiring rehearsal passed`

or:

- `Partial - tenant scope staging route/query wiring rehearsal blocked`

Production cutover must remain `NO-GO`.
