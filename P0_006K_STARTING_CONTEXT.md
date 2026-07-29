# P0-006K Starting Context

Date: 2026-05-26, Asia/Dubai

Task: Tenant scope staging route/query wiring gate.

## Current State

P0-006J completed staging verification after the approved staging compatibility-column backfill.

Current P0-006 status before this task:

- `Partial - tenant scope staging verification passed`

Completed evidence available:

- `P0_006J_TENANT_SCOPE_STAGING_VERIFICATION_RESULT.md`
- `P0_006J_CROSS_TENANT_LEAKAGE_REVIEW.md`
- `P0_006J_EMPLOYEE_OWNER_ACCESS_SCOPE_REVIEW.md`
- `P0_006J_PRODUCTION_NO_GO_REVIEW.md`
- `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE_RESULT.md`
- `TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE_RESULT.md`

## What P0-006J Proved

| Area                        | Result | Notes                                                                                                     |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Scoped staging rows         | PASS   | `sessions`, `transactions`, `entry_events`, and `audit_logs` contain approved compatibility scope values. |
| Manual-required rows        | PASS   | `active_sessions`, `arrear_tasks`, and `employee_users` remained untouched.                               |
| Legacy CORPID preservation  | PASS   | Legacy `corpid` values were not removed or rewritten.                                                     |
| Cross-tenant leakage gate   | PASS   | Local/staging query fixtures remove cross-tenant rows from legacy `corpid` results.                       |
| Employee/owner route policy | PASS   | Local/staging route policy gates preserve expected allow/deny behavior.                                   |
| Production cutover          | NO-GO  | Production deploy, migration, and route/query switch remain unapproved.                                   |

## What Remains Open

| Open Item                      | Reason                                                                                            | Status                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------ |
| Live Worker route wiring       | Route policy exists as a gate, but live route handlers are not wired to tenant scope enforcement. | Manual approval required |
| Dashboard/history query wiring | Query policy exists as a gate, but live dashboard/history SQL remains legacy.                     | Manual approval required |
| Auth claim propagation         | Session and membership claim sources are not live-wired.                                          | Manual review required   |
| Legacy CORPID fallback removal | Compatibility fallback must remain until production migration and rollback are approved.          | Production NO-GO         |
| Production tenant switch       | Production migration, backfill, route/query wiring, rollout, and rollback are not approved.       | Production NO-GO         |

## Minimum Safe Scope For P0-006K

This task is a local/staging gate only.

Allowed:

- Aggregate existing route enforcement and dashboard/history query gates.
- Define which routes can enter a future staging wiring rehearsal.
- Keep auth claim and legacy fallback items as manual-required.
- Generate reports, tests, and next prompt.

Forbidden:

- Production deploy.
- Production migration.
- Production D1 write.
- Staging D1 write.
- Staging schema migration.
- Staging backfill write.
- Live dashboard mutation.
- Live financial formula change.
- Legacy CORPID removal.

## Result

P0-006K can safely proceed as a route/query wiring readiness gate, not a live route implementation.
