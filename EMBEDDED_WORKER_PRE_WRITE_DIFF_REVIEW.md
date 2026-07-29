# Embedded Worker Pre-Write Diff Review

Date: 2026-05-24, Asia/Dubai

Scope: P1-006B controlled embedded Worker write. This review compares the current tracked embedded artifact with the dry-run generated artifact before any controlled write.

## Summary

| Check                                                     | Current Embedded                                                | Dry-run Generated                                             | Result           | Risk                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `/api/staging/handover/commit` exists                     | No                                                              | Yes                                                           | PASS for dry-run | Current embedded cannot validate staging handover endpoint.                                |
| `ENABLE_HANDOVER_ATOMIC_STAGING` exists                   | No                                                              | Yes                                                           | PASS for dry-run | Current embedded lacks staging feature-flag guard.                                         |
| `APP_ENV` production-disabled guard exists                | Partial: `APP_ENV` present, `HSC_ALLOWED_APP_ENVS` missing      | Yes                                                           | PASS for dry-run | Production-disabled staging route behavior cannot be trusted in current embedded artifact. |
| Staging handover table references exist                   | No                                                              | Yes                                                           | PASS for dry-run | Current embedded cannot persist staging commit evidence.                                   |
| `/api/delete_session` route exists                        | Yes                                                             | Yes                                                           | PASS             | P0-004 route remains present.                                                              |
| `delete_session` void / soft-delete indicators exist      | Yes                                                             | Yes                                                           | PASS             | Void behavior indicators are preserved in dry-run.                                         |
| `/api/me` exists                                          | Yes                                                             | Yes                                                           | PASS             | Identity route remains present.                                                            |
| `/api/history` exists                                     | Yes                                                             | Yes                                                           | PASS             | Owner history route remains present.                                                       |
| Auth guards exist                                         | Yes                                                             | Yes                                                           | PASS             | Auth smoke paths remain present.                                                           |
| Owner/admin reject related logic exists                   | Yes                                                             | Yes                                                           | PASS             | Role checks remain present in dry-run source-derived artifact.                             |
| Money / backend totals / handover atomic references exist | Source-derived generated artifact includes current Worker logic | Yes                                                           | PASS             | Dry-run is closer to source than current embedded.                                         |
| Secret-like content                                       | Not detected by `security:secrets` baseline                     | Not detected by controlled write precheck                     | PASS             | Secret scan still required after write.                                                    |
| Obvious truncation                                        | Current embedded builds but is stale                            | Dry-run generated contains critical route/guard/table markers | PASS             | Size increase is explained by new source logic.                                            |
| File size                                                 | 1,051,237 bytes                                                 | 1,077,580 bytes                                               | EXPECTED         | Increase is consistent with added staging handover logic.                                  |
| Route inventory                                           | 1 route mismatch                                                | Expected to match after write                                 | PASS for dry-run | Current embedded blocks embedded deploy validation.                                        |

## Pre-Write Gate

The dry-run generated artifact is acceptable for controlled write because:

1. It contains `/api/staging/handover/commit`.
2. It contains `ENABLE_HANDOVER_ATOMIC_STAGING`.
3. It contains `HSC_ALLOWED_APP_ENVS` and `APP_ENV` production guard markers.
4. It contains `handover_commits`, `handover_commit_rows`, and `handover_idempotency_keys`.
5. It preserves `/api/delete_session` and void markers.
6. It is generated from `deploy-worker/src/index.js`.
7. It is written only to `.tmp` before controlled write.

If post-write route or freshness verification fails, the artifact must be rolled back from the generated backup or by `git restore -- deploy-worker/src/index.embedded.js`.
