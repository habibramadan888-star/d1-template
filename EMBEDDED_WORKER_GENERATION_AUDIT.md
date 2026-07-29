# Embedded Worker Generation Audit

Date: 2026-05-24, Asia/Dubai

Scope: audit existing embedded generation flow and add safe dry-run capability. No formal artifact overwrite was performed.

## Findings

| Question                                         | Answer                                                            | Evidence                                                | Risk                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| Does a generator exist?                          | Yes                                                               | `deploy-worker/scripts/build-embedded-worker.js`        | It writes directly to `deploy-worker/src/index.embedded.js`.            |
| Generation source                                | `deploy-worker/src/index.js` plus files in `deploy-worker/public` | Existing generator reads `sourcePath` and `publicDir`   | Source is clear enough for dry-run reproduction.                        |
| Generation target                                | `deploy-worker/src/index.embedded.js`                             | Existing generator `outPath`                            | Direct writes are not safe without human diff review.                   |
| Deterministic enough?                            | Mostly, subject to asset order and source content                 | `fs.readdirSync(publicDir)` and full source replacement | Needs explicit source hash marker and controlled dry-run comparison.    |
| Could include secrets?                           | No obvious secret input in generator                              | Reads public assets and source Worker only              | Still requires `npm run security:secrets` before controlled write.      |
| Production artifact modified by existing script? | Yes, if run directly                                              | Existing script writes `src/index.embedded.js`          | Existing script is not safe as an unattended night-shift operation.     |
| Source map / minify                              | No                                                                | Existing script concatenates helper and source          | Easier diff, larger artifact.                                           |
| Generated file header                            | No reliable marker in current artifact                            | `npm run verify:embedded-worker` reports no marker      | Freshness cannot be proven from the file alone.                         |
| Source hash marker                               | Missing in current artifact                                       | `EMBEDDED_WORKER_FRESHNESS_RESULT.md`                   | Deploy reviewers cannot prove artifact freshness without external diff. |
| Dry-run mode                                     | Added as separate script                                          | `scripts/generate-embedded-worker-dry-run.mjs`          | Safe because output is `.tmp/embedded-worker-dry-run/`.                 |
| Controlled write                                 | Not implemented in this task                                      | `EMBEDDED_WORKER_CONTROLLED_WRITE_PLAN.md`              | Requires human approval before any artifact overwrite.                  |

## Dry-Run Result

- `npm run build:embedded:dry-run` generated `.tmp/embedded-worker-dry-run/index.embedded.generated.js`.
- Current embedded artifact is missing six checked critical items:
  - `/api/staging/handover/commit`
  - `ENABLE_HANDOVER_ATOMIC_STAGING`
  - `HSC_ALLOWED_APP_ENVS`
  - `handover_commits`
  - `handover_commit_rows`
  - `handover_idempotency_keys`
- Dry-run generated artifact contains all checked critical items.
- Current embedded artifact hash differs from dry-run output, so controlled write requires human review.

## Conclusion

Dry-run generation is available and safe for review. Controlled write is not approved and was not executed.
