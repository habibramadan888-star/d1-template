# P1-006B Starting Context

Date: 2026-05-24, Asia/Dubai

Scope: controlled embedded Worker artifact write. This task does not deploy, does not run remote or production D1 migration, and does not approve production release.

## Entrypoints

| Area                       | Path / Config                                                     | Status                                                                                               |
| -------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Source Worker              | `deploy-worker/wrangler.toml` -> `src/index.js`                   | Canonical source-backed entrypoint used by current local smoke and full checks.                      |
| Embedded Worker            | `deploy-worker/wrangler.embedded.toml` -> `src/index.embedded.js` | Deployable alternate artifact path; stale before this task.                                          |
| Current embedded artifact  | `deploy-worker/src/index.embedded.js`                             | Missing P0-002C staging handover route and related guards/tables before controlled write.            |
| Dry-run generated artifact | `.tmp/embedded-worker-dry-run/index.embedded.generated.js`        | Generated from `deploy-worker/src/index.js`; previous P1-006 dry-run found 0 missing critical items. |

## P1-006 Evidence Summary

1. `WORKER_ENTRYPOINT_DRIFT_AUDIT.md` showed the source Worker had `/api/staging/handover/commit`, while embedded did not.
2. `EMBEDDED_WORKER_FRESHNESS_RESULT.md` returned `MANUAL_REQUIRED` because `wrangler.embedded.toml` points to `src/index.embedded.js` and the artifact was missing critical source behavior.
3. `EMBEDDED_WORKER_GENERATION_DRY_RUN_RESULT.md` showed the dry-run generated artifact contained all checked critical items.
4. `EMBEDDED_WORKER_CONTROLLED_WRITE_PLAN.md` defined a human-approved controlled write sequence with backup, hash evidence, secret scan, and full validation.

## Missing Critical Items Before Write

| Critical item                    | Current embedded before write | Dry-run generated |
| -------------------------------- | ----------------------------- | ----------------- |
| `/api/staging/handover/commit`   | Missing                       | Present           |
| `ENABLE_HANDOVER_ATOMIC_STAGING` | Missing                       | Present           |
| `HSC_ALLOWED_APP_ENVS`           | Missing                       | Present           |
| `handover_commits`               | Missing                       | Present           |
| `handover_commit_rows`           | Missing                       | Present           |
| `handover_idempotency_keys`      | Missing                       | Present           |

## Write Preconditions

1. Baseline validation must pass before write.
2. `npm run build:embedded:dry-run` must generate an artifact with 0 missing critical items.
3. Generated artifact must not contain secret-like values.
4. Existing `deploy-worker/src/index.embedded.js` must be backed up under `.tmp/embedded-worker-backups/`.
5. Write target must be limited to `deploy-worker/src/index.embedded.js`.
6. No `wrangler deploy`, remote D1, or production config command may run.

## Post-Write Verification Required

1. `npm run audit:worker-drift`
2. `npm run verify:embedded-worker`
3. `npm run build:embedded:dry-run`
4. `npm run smoke:embedded-with-worker`
5. Full existing P0/P1 validation chain
6. `npm run security:secrets`

## Why This Is Not Production Deploy

This task only refreshes a tracked generated Worker artifact and verifies it locally. It does not run Cloudflare deploy, does not mutate remote D1, does not switch live traffic, and does not approve production release. Any staging or production deploy still requires a separate deploy gate.
