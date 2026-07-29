# Handover Staging Endpoint Implementation

Generated: 2026-05-24, Asia/Dubai

Scope: P0-002C local/staging-only implementation. This does not switch the live employee handover flow, does not change owner dashboard results, does not change live financial formulas, and does not execute production or remote D1 migrations.

## Implemented Endpoint

| Item                         | Result                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Method                       | `POST`                                                                                                |
| Path                         | `/api/staging/handover/commit`                                                                        |
| Production behavior          | `404 NOT_FOUND`                                                                                       |
| Non-production with flag off | `403 FEATURE_DISABLED`                                                                                |
| Feature flag                 | `ENABLE_HANDOVER_ATOMIC_STAGING=true`                                                                 |
| Allowed `APP_ENV`            | `development`, `dev`, `local`, `test`, `staging`                                                      |
| Allowed submitter            | authenticated `staff` / employee role only                                                            |
| Owner/admin submit           | `403 FORBIDDEN`                                                                                       |
| Accounting authority         | backend recomputed totals from submitted rows                                                         |
| Frontend totals mismatch     | rejected with `422 FRONTEND_TOTALS_MISMATCH`                                                          |
| Voided rows                  | rejected with `422 VOIDED_REJECTED`                                                                   |
| Idempotency                  | same key replay returns `IDEMPOTENT_REPLAY`; same rows with new key returns `DUPLICATE_HANDOVER_RISK` |

## Files Changed

- `deploy-worker/src/index.js`: added guarded staging endpoint and non-live staging commit logic.
- `migrations/local/002_handover_atomic_staging.sql`: added local/staging tables for atomic commit rehearsal.
- `scripts/local-worker-utils.mjs`: added dev-only `--var` support for isolated Worker tests.
- `tests/handover-staging-endpoint.spec.mjs`: added endpoint regression coverage.
- `scripts/rehearse-handover-staging-endpoint.mjs`: added disposable local D1 endpoint rehearsal.
- `package.json`: added endpoint test and rehearsal scripts.
- `scripts/audit-api.mjs`: added route metadata so API inventory drift gate remains active.

## Storage Behavior

Successful staging commits write only:

- `handover_commits`
- `handover_commit_rows`
- `handover_idempotency_keys`
- `handover_audit_events`
- `audit_logs`
- `entry_events`

Successful staging commits do not write:

- `transactions`
- `deposit_ledger`
- `arrears`
- live dashboard/history source tables

## Verification Evidence

```text
npm run test:handover-staging-endpoint
PASS - production 404, flag disabled 403, unauth 401, invalid JWT 401, owner 403,
employee success, missing idempotency 400, idempotent replay, duplicate risk,
frontend totals mismatch rejection, voided row rejection, invalid money rejection,
staging table writes, no legacy financial table writes, audit/entry event evidence.

npm run rehearse:handover-staging-endpoint
PASS - generated HANDOVER_STAGING_ENDPOINT_REHEARSAL_RESULT.md from disposable local D1.
```

## Remaining Limits

- P0-002 remains Partial because the live employee handover route is not switched.
- The endpoint is disabled outside local/staging feature-flag conditions.
- The local migration is not a production migration.
- P0-001C minor-unit dual-write, P0-003 live totals authority, P0-006 tenant isolation, and P0-008 receivables remain separate gates before production cutover.
