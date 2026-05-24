# Handover Staging Manual Validation Guide

Generated: 2026-05-24, Asia/Dubai

Scope: manual QA guide for `POST /api/staging/handover/commit`. This guide is local/staging-only. It does not approve live employee UI cutover, production migration, remote D1 migration, production deployment, live dashboard changes, or live financial formula changes.

## Prerequisites

1. Current branch: `verify/p0-002d-handover-staging-manual-validation`.
2. Local dev secrets must exist in `deploy-worker/.dev.vars`.
3. Required local keys: `JWT_SECRET`, `PW_SALT`, `MANAGER_PW_HASH`, `LOCAL_MANAGER_PASSWORD`, `LOCAL_EMPLOYEE_ID`, `LOCAL_EMPLOYEE_PIN`, `ALLOW_DEV_SEED=true`.
4. For local/staging validation set `APP_ENV=test` or `APP_ENV=staging`.
5. Enable the route with `ENABLE_HANDOVER_ATOMIC_STAGING=true`.
6. Confirm production is disabled by running `npm run test:handover-staging-endpoint` or manual test `MAN-HSC-001`.
7. Start local Worker with the project scripts, not production deploy commands.
8. Employee login uses `/auth/employee-login`.
9. Owner login uses `/auth/login`.
10. Owner/admin submit must be rejected. Owner may inspect live surfaces but cannot submit employee handover.
11. Legacy live flow remains the existing employee UI and existing endpoints. The staging endpoint is not linked to the employee page.

## Manual Test Cases

| Test ID     | Purpose                        | Preconditions                                           | Request                             | Expected Status | Expected Response                                       | Expected DB Evidence                                                             | Expected Audit Evidence                                                         | Pass / Fail | Notes                                                                      |
| ----------- | ------------------------------ | ------------------------------------------------------- | ----------------------------------- | --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| MAN-HSC-001 | production disabled test       | Worker started with `APP_ENV=production`, flag true     | `POST /api/staging/handover/commit` | `404`           | Route hidden / not found                                | No staging rows                                                                  | No accepted audit                                                               |             | Production must never expose this route.                                   |
| MAN-HSC-002 | feature flag off disabled test | `APP_ENV=test`, `ENABLE_HANDOVER_ATOMIC_STAGING=false`  | `POST /api/staging/handover/commit` | `403`           | `FEATURE_DISABLED`                                      | No staging rows                                                                  | No accepted audit                                                               |             | Feature flag is the second guard.                                          |
| MAN-HSC-003 | employee valid submit          | Employee cookie, valid payload                          | `POST /api/staging/handover/commit` | `201`           | `ACCEPTED`, backend totals, frontend comparison matches | `handover_commits`, `handover_commit_rows`, `handover_idempotency_keys` increase | `audit_logs`, `entry_events`, `handover_audit_events` contain staging evidence  |             | Writes staging tables only.                                                |
| MAN-HSC-004 | missing idempotency key        | Employee cookie, missing `idempotency_key`              | `POST /api/staging/handover/commit` | `400`           | `MISSING_IDEMPOTENCY_KEY`                               | No accepted commit                                                               | Rejection/attempt evidence if persisted                                         |             | Idempotency is mandatory.                                                  |
| MAN-HSC-005 | idempotent replay              | Repeat MAN-HSC-003 with same key and payload            | `POST /api/staging/handover/commit` | `200`           | `IDEMPOTENT_REPLAY`                                     | No duplicate commit rows                                                         | Replay/audit evidence only                                                      |             | Weak network retry should be safe.                                         |
| MAN-HSC-006 | weak network retry             | Simulate duplicate client retry with same key           | `POST /api/staging/handover/commit` | `200`           | Replay result                                           | No duplicate financial or staging rows                                           | Replay/audit evidence                                                           |             | Same behavior as idempotent replay.                                        |
| MAN-HSC-007 | frontend totals mismatch       | Employee cookie, tampered frontend totals               | `POST /api/staging/handover/commit` | `422`           | `FRONTEND_TOTALS_MISMATCH`                              | No accepted commit                                                               | Mismatch audit evidence                                                         |             | Frontend totals are comparison only.                                       |
| MAN-HSC-008 | voided row reject              | Employee cookie, row has `status=VOIDED` or `voided_at` | `POST /api/staging/handover/commit` | `422`           | `VOIDED_REJECTED`                                       | No accepted commit                                                               | Voided rejection evidence                                                       |             | Voided rows cannot be recommitted.                                         |
| MAN-HSC-009 | owner submit reject            | Owner cookie                                            | `POST /api/staging/handover/commit` | `403`           | `FORBIDDEN` / owner submit rejected                     | No accepted commit                                                               | Denial evidence if persisted                                                    |             | Owner cannot submit employee handover.                                     |
| MAN-HSC-010 | admin submit reject            | Future admin cookie or admin role fixture               | `POST /api/staging/handover/commit` | `403`           | `FORBIDDEN`                                             | No accepted commit                                                               | Denial evidence if persisted                                                    |             | Current system may not have a separate admin role; keep as future QA case. |
| MAN-HSC-011 | invalid money 3 decimals       | Employee cookie, `amount=100.999`                       | `POST /api/staging/handover/commit` | `422`           | `INVALID_AMOUNT`                                        | No accepted commit                                                               | Rejection evidence                                                              |             | AED must be exact fils.                                                    |
| MAN-HSC-012 | empty amount                   | Employee cookie, empty amount                           | `POST /api/staging/handover/commit` | `422`           | `INVALID_AMOUNT`                                        | No accepted commit                                                               | Rejection evidence                                                              |             | Empty money cannot silently become zero.                                   |
| MAN-HSC-013 | staging tables written         | After MAN-HSC-003                                       | D1 query                            | n/a             | n/a                                                     | Staging table counts increase                                                    | Accepted audit exists                                                           |             | Use `npm run verify:handover-legacy-unchanged`.                            |
| MAN-HSC-014 | legacy tables unchanged        | After MAN-HSC-003                                       | D1 query                            | n/a             | n/a                                                     | `transactions`, `deposit_ledger`, `arrears` unchanged                            | Staging audit exists                                                            |             | Use `npm run verify:handover-legacy-unchanged`.                            |
| MAN-HSC-015 | audit evidence exists          | After accepted/rejected cases                           | D1 query                            | n/a             | n/a                                                     | n/a                                                                              | `audit_logs`, `entry_events`, `handover_audit_events` contain handover evidence |             | Audit evidence must be queryable.                                          |
| MAN-HSC-016 | live dashboard unchanged       | Before and after staging submit                         | Owner live API snapshot             | `200`           | Before/after snapshots equal                            | Legacy live tables unchanged                                                     | Staging audit exists                                                            |             | Use `npm run verify:dashboard-unchanged`.                                  |

## Helper Commands

Run:

```powershell
npm run manual:handover-staging
npm run verify:dashboard-unchanged
npm run verify:handover-legacy-unchanged
```

`npm run manual:handover-staging` generates `HANDOVER_STAGING_MANUAL_COMMANDS.md` with copyable PowerShell examples and redacted cookie placeholders.

## Manual QA Result Summary

| Area                      | Status                                    |
| ------------------------- | ----------------------------------------- |
| Production disabled       | Automated local verification ready        |
| Feature flag disabled     | Automated local verification ready        |
| Employee valid submit     | Automated local verification ready        |
| Idempotency replay        | Automated local verification ready        |
| Frontend totals tamper    | Automated local verification ready        |
| Voided row reject         | Automated local verification ready        |
| Owner/admin submit reject | Owner automated; admin future role manual |
| Dashboard unchanged       | Automated evidence wrapper ready          |
| Legacy tables unchanged   | Automated evidence wrapper ready          |
