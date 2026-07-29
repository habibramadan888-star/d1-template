# P0-006P Audit Logs / Entry Events Manual Review Packet

Date: 2026-05-26, Asia/Dubai

Scope: manual review packet for the two remaining tenant access matrix coverage gaps. No
production deploy, production migration, production D1 write, production URL call, staging D1
write, dashboard mutation, live financial formula change, or secret exposure occurred.

## Summary

`audit_logs` and `entry_events` remain `MANUAL_REQUIRED`. P0-006P does not mark them as PASS
because automatically proving their production-grade tenant/property attribution requires
dedicated staging audit/event rows from the live write paths and manual review of actor/resource
scope.

| Area           | Why Manual Required                                                                                                                       | Current Scope Columns                                                                                              | Safe Automatic Verification? | Needed Staging Data                                                       | Needed Evidence                                                           | Follow-Up |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------- |
| `audit_logs`   | Audit attribution must prove actor tenant/property and affected resource tenant/property; matrix fixtures do not prove live audit writes. | Compatibility columns exist from staging schema/backfill work, plus legacy `corpid`/actor fields depending row.    | no                           | staging-only audit rows from scoped employee/owner actions                | before/after audit rows with tenant_id/property_id/actor role/resource id | P0-006Q   |
| `entry_events` | Entry event scope must prove employee write-path event rows carry tenant/property scope and cannot be cross-tenant attributed.            | Compatibility columns exist from staging schema/backfill work, plus legacy `corpid`/employee fields depending row. | no                           | staging-only entry event rows from scoped employee entry/handover actions | event rows linked to scoped actor/resource and rejection evidence         | P0-006Q   |

## Current State

- Both rows are represented in `TENANT_SCOPE_STAGING_ACCESS_MATRIX_REHEARSAL_RESULT.md`.
- Both rows are intentionally reported as `MANUAL_REQUIRED`.
- No automatic PASS was fabricated.
- No staging D1 write was executed in this task.

## What P0-006Q Should Close

1. Generate or inspect staging/local audit/event rows with explicit tenant/property scope.
2. Prove accepted actions and denied actions are both auditable.
3. Prove cross-tenant/cross-property denied attempts do not create misleading scoped success rows.
4. Confirm legacy `CORPID` fallback remains warning-only.
5. Keep production disabled and P0-006 Partial.

## Production NO-GO

Production remains `NO-GO` because production JWT/session tenant claims, production migration,
production backfill, production audit attribution, live route/query cutover, and production deploy
approval are not complete.
