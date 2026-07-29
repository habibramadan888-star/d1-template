# HOMELINK Seven Event Final Production Promotion 084

## Outcome

- Task status: `ROLLED_BACK_EMPLOYEE_DRAFT_PRESERVATION_FAILURE`
- Promotion completed at 100%: no
- Rollback completed: yes
- Production version after rollback: `84ee2023-f550-47e0-9e4f-3caa161a3431` at 100%
- Runtime or UI source changes: none
- Production business writes initiated by this task: 0
- Migration applied: no

The fixed artifact passed integrity, binding, 10% canary, public asset, QA-route, and authenticated Employee page checks. After the 100% switch, the same authenticated Employee browser changed from `Current Session (1)` to `Current Session (0)`. Its identity label also changed from the employee display name to `Not signed in`, and Bed Transfer became disabled. The task contract lists an existing employee draft being cleared as an immediate rollback condition, so traffic was restored without a hotfix.

## Fixed artifact

- Final accepted Full run: `QA-20260717-435823E5`
- Expected SHA-256: `dcd4facf5425fbd7eba86198cdde4d4d6edea88bf0c9893a2e15fc2943164e7c`
- Recomputed SHA-256: `dcd4facf5425fbd7eba86198cdde4d4d6edea88bf0c9893a2e15fc2943164e7c`
- Worker byte SHA-256: `42df5218c8d276ed9a79b83568f1c49cffdbe4fd2355b20081c82588b9967906`
- Asset manifest SHA-256: `d0c3a39b94887641b69a3d0d1f99d5629b469294ed71567939fed6d881e75660`
- Target Owner asset SHA-256: `9d91ed41a9226089f744d54c970b1972cb64a8e3ae91a44386ba8ebaebeaf36c`
- Artifact commit: `36c4205b31d863e2ec66387249606ea8bcfdbb89`
- Closure commit: `89b9e65f6761e8fbe8e89c3a7e6961e6fa57f721`
- Rebuild performed: no

## Production bindings

Before, candidate, and rollback versions used the same bindings:

- Worker: `homelink-finance`
- Hostname: `https://homelink-finance.habibramadan888.workers.dev`
- D1 binding: `DB` / `562aa079-1cca-4176-ba3b-7276a65f98fb`
- KV binding: `RATE_LIMIT` / `c7c64d522d964baba2e72454e7262da9`
- Compatibility date: `2024-09-23`
- Secret names were unchanged; no secret values were read or recorded.
- Candidate `APP_ENV`: `production`
- Candidate QA acceptance binding: absent
- Candidate QA D1/KV bindings: absent
- Rollback `APP_ENV`: `internal_beta`
- Binding drift: none

## Traffic timeline

Times are UTC (Asia/Dubai is UTC+04:00).

- Candidate version uploaded: `3de1cbe0-3fff-4929-972f-1f58f7f39ad6` at `2026-07-17T15:19:03.209Z` (`19:19:03.209` Dubai), initially 0%.
- Canary deployment: candidate 10% / rollback version 90% at `2026-07-17T15:19:40.933Z` (`19:19:40.933` Dubai).
- Canary byte-hit sample: target Owner asset observed 2 of 30 requests; all 30 returned HTTP 200.
- 100% candidate deployment: `2026-07-17T15:27:57.690Z` (`19:27:57.690` Dubai).
- Rollback deployment: `2026-07-17T15:29:41.069Z` (`19:29:41.069` Dubai).
- Candidate 100% exposure: approximately 103 seconds.
- Required 15-minute observation: not completed because the immediate rollback gate fired.

## Read-only health evidence

Before the 100% switch, the authenticated Employee page showed the employee name, the `STAFF` role, all seven event buttons, `Current Session (1)`, and no console errors. The public root and Owner JavaScript asset returned HTTP 200. Unauthenticated `/api/me` returned bounded JSON HTTP 401. `/qa/acceptance` returned HTTP 404.

After the 100% switch, the same Employee page still rendered the primary navigation and seven event labels without console errors, but the draft count changed to 0, the identity label changed to `Not signed in`, and Bed Transfer was disabled. No Validate, Upload, New Session, Undo, Todo, Void, or TTLock refresh action was clicked.

The isolated Owner browser had no available saved Production Owner password, so authenticated Owner History/Finance checks were not used to override the already-triggered rollback condition. No credential was read, copied, logged, or guessed.

After rollback:

- Control plane: `84ee2023-f550-47e0-9e4f-3caa161a3431` at 100%.
- Root: HTTP 200.
- Owner JavaScript: HTTP 200, SHA-256 `acf8aae97c54ad53c166a5228966da7be61c553e2ff682cd93e659bd24f04359`.
- Unauthenticated `/api/me`: HTTP 401 JSON.
- `/qa/acceptance`: HTTP 404.
- No core 500/503 was observed.

## Business-data boundary

Pre-check:

- Sessions: 118; latest `2026-07-15T20:31:14.127Z`
- Transactions: 3192; latest `2026-07-15T17:17:03+04:00`
- Sessions with non-empty `entries_json`: 15
- Audit logs: 805

Post-rollback:

- Sessions: 118; latest `2026-07-15T20:31:14.127Z`
- Transactions: 3192; latest `2026-07-15T17:17:03+04:00`
- Sessions with non-empty `entries_json`: 15
- Audit logs: 808; latest `2026-07-17 15:29:53`
- D1 verification query: `rows_written=0`, `changed_db=false`

The three new audit rows are operational authentication/deployment verification evidence. This task issued no business-write endpoint request and did not create, upload, void, finalize, or reconcile a business record.

## TTLock boundary

- No card reload, bed lookup, Validate, Upload, or Exit Event action was triggered.
- No TTLock configuration, credentials, D1/KV binding, cache, TTL, single-flight, or request-scope code was changed.
- No new external TTLock path was introduced because the exact fixed artifact bytes were used.
- The required long observation was interrupted by rollback; therefore a Production live call-rate conclusion is not claimed.

## Closure

The production-promotion completion gate is not met. The candidate version remains uploaded with 0% traffic for forensic comparison, while the approved rollback version is restored to 100%. A future promotion must first demonstrate preservation of an existing Employee local draft and stable authenticated identity under `APP_ENV=production` without changing the fixed-artifact discipline.
