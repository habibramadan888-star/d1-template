# P0 Arrears Backend SOT Deploy Worktree Check

| File                                               | Dirty | Used In Deploy | Risk                                                                                                                                                                                    | Action                                                          |
| -------------------------------------------------- | ----: | -------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `COMMERCIAL_LAUNCH_READINESS_MATRIX.md`            |   yes |             no | Generated readiness report; not part of Worker script/assets.                                                                                                                           | Do not commit.                                                  |
| `COMMERCIAL_LAUNCH_READINESS_RESULT.md`            |   yes |             no | Generated readiness report; not part of Worker script/assets.                                                                                                                           | Do not commit.                                                  |
| `EMBEDDED_WORKER_FRESHNESS_RESULT.md`              |   yes |             no | Generated verification report; not part of Worker script/assets.                                                                                                                        | Do not commit.                                                  |
| `EMBEDDED_WORKER_GENERATION_DRY_RUN_RESULT.md`     |   yes |             no | Generated dry-run report; not part of Worker script/assets.                                                                                                                             | Do not commit.                                                  |
| `EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md` |   yes |             no | Generated QA dry-run report; not part of Worker script/assets.                                                                                                                          | Do not commit unless regenerated evidence is explicitly needed. |
| `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`                 |   yes |             no | Generated drift report; not part of Worker script/assets.                                                                                                                               | Do not commit.                                                  |
| `deploy-worker/public/portal.html`                 |   yes |            yes | `wrangler.toml` deploys `./public` assets. Diff is line-ending-only; content matches `HEAD` after normalizing line endings and still contains only employee/owner/admin portal buttons. | Safe for deploy; do not commit.                                 |

## Decision

Proceed with deployment only after predeploy validation passes.

No D1 command, migration, business write, employee entry write, handover, void/delete, or production cutover is authorized.
