# Embedded Worker Drift Review For Handover Staging

Generated: 2026-05-24, Asia/Dubai

Scope: audit only. The embedded Worker artifact was not regenerated, edited, deployed, or promoted.

## Findings

| Question                                                              | Answer                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Does `deploy-worker/src/index.js` contain the staging route?          | Yes. It contains `/api/staging/handover/commit`, `ENABLE_HANDOVER_ATOMIC_STAGING`, and staging table writes.                          |
| Does `deploy-worker/src/index.embedded.js` contain the staging route? | No. `rg` found no staging route, feature flag, or staging table markers in the embedded source.                                       |
| Which config uses `index.js`?                                         | `deploy-worker/wrangler.toml` uses `main = "src/index.js"`.                                                                           |
| Which config uses `index.embedded.js`?                                | `deploy-worker/wrangler.embedded.toml` uses `main = "src/index.embedded.js"`.                                                         |
| Does the dry-run assets build include the route?                      | Yes, `.wrangler-dryrun/assets/index.js` includes the staging route after dry-run build.                                               |
| Does this block local validation?                                     | No. Local/main Worker validation uses `wrangler.toml` and passed.                                                                     |
| Does this block embedded staging deploy?                              | Yes, conditionally. A staging deploy using `wrangler.embedded.toml` would not include the route until controlled regeneration occurs. |

## Risk

The repo now has a source/artifact split: main Worker source includes P0-002C, but embedded Worker source does not. If the embedded config is used for staging or production, the staging endpoint will be missing. This is a P1 deploy-prep risk, not a local validation blocker.

## Recommendation

1. Do not deploy the embedded Worker path for P0-002C validation until a controlled regeneration step is approved.
2. Create a dedicated P1-006 task to regenerate and diff `src/index.embedded.js` from the canonical source.
3. Add an embedded drift CI check before any production deploy.
4. Keep P0-002D local/manual validation on `wrangler.toml` only.

## Current Decision

No embedded artifact was modified. This is documented as a conditional staging deploy blocker.
