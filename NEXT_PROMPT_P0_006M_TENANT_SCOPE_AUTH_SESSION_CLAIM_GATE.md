# NEXT PROMPT: P0-006M Tenant Scope Auth/Session Claim Gate

Use this prompt only after P0-006L has passed.

## Goal

Design and verify the staging/local auth/session claim gate needed before any live tenant-scope route/query wiring can be production-safe.

This task must stay staging/local only.

## Required Scope

Review and gate:

1. Owner login claim shape.
2. Employee login claim shape.
3. `active_sessions` compatibility fields.
4. Membership source of truth.
5. Company/property claim propagation.
6. Legacy `CORPID` compatibility fallback.
7. Route/query wiring dependency on session claims.
8. Rollback plan if scoped claims are wrong.

## Strictly Forbidden

1. No production deploy.
2. No production migration.
3. No remote production D1 migration.
4. No production D1 write.
5. No production URL call.
6. No production feature flag enablement.
7. No production cutover.
8. No legacy CORPID fallback removal.
9. No live dashboard mutation.
10. No live financial formula change.
11. No secret commit.
12. No password/token/cookie output.
13. Do not mark P0-006 Verified.

## Required Outputs

1. `P0_006M_AUTH_SESSION_CLAIM_STARTING_CONTEXT.md`
2. `P0_006M_AUTH_SESSION_CLAIM_MATRIX.md`
3. `P0_006M_ROUTE_QUERY_CLAIM_DEPENDENCY_REVIEW.md`
4. `P0_006M_ROLLBACK_PLAN.md`
5. `P0_006M_PRODUCTION_NO_GO_REVIEW.md`
6. Updated status reports.

## Expected Status

P0-006 may only become:

- `Partial - tenant scope auth/session claim gate ready`

or:

- `Partial - tenant scope auth/session claim gate blocked`

Production cutover must remain `NO-GO`.
