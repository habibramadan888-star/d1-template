# Embedded Dry-Run Blocker Diagnosis

## Summary

`npm run build:embedded:dry-run` failed because the embedded generator used a brittle exact string marker for the final Worker static fallback block. The current `deploy-worker/src/index.js` fallback block still exists, but its formatting/line-ending shape no longer matched the hard-coded marker, so the generator did not inject `embeddedAssetResponse(path)` and threw `embedded fallback injection failed`.

## Required Diagnosis Matrix

| Item                           | Result                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| root cause                     | Hard-coded fallback marker in `scripts/generate-embedded-worker-dry-run.mjs` no longer matched the current Worker fallback block.                                                 |
| affected file                  | `scripts/generate-embedded-worker-dry-run.mjs`                                                                                                                                    |
| affected build step            | `generateEmbedded()` fallback injection before writing `.tmp/embedded-worker-dry-run/index.embedded.generated.js`                                                                 |
| related to three-portal change | no                                                                                                                                                                                |
| safe minimal fix               | Add a CRLF-tolerant regex fallback that targets only the existing `env.ASSETS` final fallback block, then classify successful generation with all critical items present as PASS. |

## Checks Performed

- Confirmed `deploy-worker/src/index.js` still has the final fallback:
  - `if (env.ASSETS) return env.ASSETS.fetch(request)`
  - `return new Response("Homelink Finance API is running...")`
- Confirmed the generator was still looking for an exact marker string.
- Confirmed `/`, `/employee-v3.html`, `/index.html`, and `/unified-login.html` route compatibility logic was not the cause.
- Confirmed asset manifest generation was not missing assets; after injection fix the generator embedded 10 assets.
- Confirmed generated and current embedded artifacts both contain all checked critical items.
- Confirmed `audit:worker-drift` has `WORKER_DRIFT_CRITICAL_MISMATCHES=0`; route mismatches remain non-critical and are not caused by this task.

## Safety

- No runtime route logic was modified.
- No business logic was modified.
- No D1 command was run.
- No migration was run.
- Production cutover remains `PRODUCTION_NO_GO`.
