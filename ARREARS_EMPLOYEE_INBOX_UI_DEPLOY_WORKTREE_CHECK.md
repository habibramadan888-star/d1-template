# Arrears Employee Inbox UI Deploy Worktree Check

Date: 2026-05-31

## HEAD Check

| Commit | Present | Notes |
|---|---|---|
| `15149cd fix: separate dry-run dispatch from employee directive inbox` | yes | UI/read-only wiring implementation is in current history. |
| `64a4255 docs: require deploy approval for employee directive inbox UI` | yes | Deploy approval document is current HEAD before this deploy task. |

## Dirty / Untracked Files

| File | Dirty/Untracked | Used In Deploy | Risk | Action |
|---|---|---|---|---|
| `COMMERCIAL_LAUNCH_READINESS_MATRIX.md` | dirty | no | report artifact only | leave uncommitted |
| `COMMERCIAL_LAUNCH_READINESS_RESULT.md` | dirty | no | report artifact only | leave uncommitted |
| `EMBEDDED_WORKER_FRESHNESS_RESULT.md` | dirty | no | verification artifact only | leave uncommitted |
| `EMBEDDED_WORKER_GENERATION_DRY_RUN_RESULT.md` | dirty | no | verification artifact only | leave uncommitted |
| `EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md` | dirty | no | QA artifact only | leave uncommitted |
| `WORKER_ENTRYPOINT_DRIFT_AUDIT.md` | dirty | no | audit artifact only | leave uncommitted |
| `ARREARS_DIRECTIVE_PRODUCTION_SMOKE_INPUT_CHECK.md` | untracked | no | old report artifact; not deploy input | leave untracked |

## Deploy Input Assessment

Wrangler production config uses:

- Worker main: `deploy-worker/src/index.js`
- Assets directory: `deploy-worker/public`

Current dirty files are outside `deploy-worker/` and are not deployment inputs. They should not be committed as part of this deploy record.

Decision: safe to continue predeploy verification.
