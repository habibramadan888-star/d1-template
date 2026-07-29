# P0-002C Staging Implementation Blueprint

Generated: 2026-05-24, Asia/Dubai

Scope: blueprint only. No route, production API, employee UI integration, dashboard change, production migration, remote D1 migration, or production deploy was performed.

## Minimum Implementation Scope

1. Add a local/staging-only `POST /api/staging/handover/commit` route.
2. Guard the route with `ENABLE_HANDOVER_ATOMIC_STAGING=true`.
3. Disable the route when `APP_ENV=production`.
4. Require authenticated employee/staff submitter.
5. Reject owner/admin submitters.
6. Validate employee/property scope using current available auth context and clearly mark static CORPID limitation.
7. Reuse `modules/finance/handover-atomic.mjs`.
8. Reuse backend totals and money helper outputs.
9. Persist staging/local commit evidence to draft handover tables only after reviewed migration.
10. Return backend recomputed totals, frontend comparison, discrepancy state, idempotency status, accepted/rejected rows, and audit evidence.

## Explicitly Forbidden Scope

1. No live employee handover flow switch.
2. No owner dashboard live result change.
3. No production endpoint enablement.
4. No production or remote D1 migration.
5. No P0-001C money migration.
6. No P0-008 receivables write.
7. No P0-006 tenant rewrite.
8. No legacy handover deletion.
9. No default production account or secret.

## Files Likely Affected In P0-002C

| File                                                                                                | Expected Change                                                          | Risk                                                            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `deploy-worker/src/index.js`                                                                        | Add feature-flagged staging route only.                                  | Medium; Worker route file is large and must be edited narrowly. |
| `modules/finance/handover-atomic.mjs`                                                               | Reuse only; modify only if endpoint needs a missing non-invasive helper. | Low if tests continue passing.                                  |
| `migration-drafts/handover_atomic_commit_draft.sql`                                                 | Review/update draft before local/staging execution.                      | Medium; do not apply to production.                             |
| `scripts/rehearse-handover-staging-endpoint.mjs`                                                    | New staging/local endpoint rehearsal script.                             | Low; test tooling only.                                         |
| `tests/handover-staging-endpoint.spec.mjs`                                                          | New route/auth/idempotency/mismatch tests.                               | Low; test tooling only.                                         |
| `package.json`                                                                                      | Add test/rehearsal scripts.                                              | Low.                                                            |
| `RUN_REPORT.md`, `VERIFICATION_STATUS.md`, `P0_P1_STATUS_REVIEW.md`, `COMMERCIALIZATION_BACKLOG.md` | Status and evidence updates.                                             | Low.                                                            |

## Route Contract

| Item                 | Rule                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Method               | `POST`                                                              |
| Path                 | `/api/staging/handover/commit`                                      |
| Feature flag         | `ENABLE_HANDOVER_ATOMIC_STAGING=true`                               |
| Environment          | `development`, `local`, or `staging` only                           |
| Production           | Disabled/404 even if code is present                                |
| Auth                 | Required server-side auth                                           |
| Allowed role         | `employee` / `staff` only                                           |
| Disallowed submitter | `owner`, `manager`, `admin`                                         |
| Money                | Parse to integer fils through money/backend totals helpers          |
| Totals               | Backend recompute is authority for response and stored draft        |
| Frontend totals      | Comparison only                                                     |
| Mismatch             | Recommended staging behavior: reject with discrepancy               |
| Void rows            | Reject                                                              |
| Audit                | Persist attempt and accepted/rejected outcome in staging audit path |

## Idempotency Rules

1. `idempotency_key` is required.
2. Same key and same request fingerprint returns the original accepted/replayed result.
3. Same key and different request fingerprint returns conflict.
4. Same rows under a different idempotency key returns duplicate warning or rejection.
5. Weak-network retry must not write duplicate financial rows.
6. Idempotency must be stored server-side, not in browser memory.

## Audit Event Rules

1. Every request creates or plans `handover_commit_attempt`.
2. Accepted commits create `handover_commit_accepted`.
3. Rejected commits create `handover_commit_rejected`.
4. Row-level accepted/rejected details must be traceable.
5. Audit payload must include actor, role, property, session, idempotency key, status, backend totals, discrepancy summary, and request id if available.

## Rollback

1. Disable `ENABLE_HANDOVER_ATOMIC_STAGING`.
2. Leave legacy employee handover untouched.
3. Preserve staging commit/audit rows for analysis.
4. Do not delete production data.
5. Re-run `npm run smoke:with-worker`, `npm run verify:clean-d1`, and route-specific tests after rollback.

## Verification Required In P0-002C

1. `npm run check`
2. `npm run smoke:with-worker`
3. `npm run verify:clean-d1`
4. `npm run test:delete-session`
5. `npm run test:money`
6. `npm run test:backend-totals`
7. `npm run test:handover-atomic`
8. New staging endpoint tests
9. New staging endpoint rehearsal script

## P0-002 Status After P0-002C

Even if P0-002C passes, P0-002 remains Partial. It can only move toward Verified after live production cutover, production-safe migrations, tenant scope, money authority, receivables decision, dashboard reconciliation, and human approval.
