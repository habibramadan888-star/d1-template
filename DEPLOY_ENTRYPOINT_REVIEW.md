# Deploy Entrypoint Review

Date: 2026-05-24, Asia/Dubai

Scope: P1-006 controlled embedded Worker drift review. No production deploy, staging deploy, remote D1 migration, production config change, or artifact overwrite was performed.

## Entrypoint Summary

| Area                     | Entrypoint / Command                                                                         | Evidence                                                                        | Current Meaning                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Local Worker dev         | `deploy-worker/wrangler.toml` -> `main = "src/index.js"`                                     | `scripts/local-worker-utils.mjs` starts `wrangler dev --config wrangler.toml`   | Local smoke and auth tests validate source Worker, not embedded artifact.                                    |
| Primary Wrangler config  | `deploy-worker/wrangler.toml` -> `src/index.js` with `[assets]` binding                      | `deploy-worker/wrangler.toml`                                                   | Default source-backed deploy path if a human deploys this config.                                            |
| Embedded Wrangler config | `deploy-worker/wrangler.embedded.toml` -> `src/index.embedded.js` without `[assets]` binding | `deploy-worker/wrangler.embedded.toml`                                          | Deployable alternate artifact path; currently stale for P0-002C staging handover.                            |
| Build dry-run            | `npm run build` runs both `build:worker:assets` and `build:worker:embedded`                  | `package.json`                                                                  | Commercial check dry-runs both packages but does not prove source/embedded behavior parity.                  |
| CI check                 | `npm run check`                                                                              | `.github/workflows/commercial-check.yml`                                        | CI runs governance/audit/test/dry-run build; it did not previously block stale embedded artifact drift.      |
| Embedded generator       | `deploy-worker/scripts/build-embedded-worker.js`                                             | Script reads `public` assets and `src/index.js`, writes `src/index.embedded.js` | Existing generator overwrites the tracked embedded artifact and lacks dry-run, diff, and source-hash marker. |

## Direct Answers

1. Local dev uses `deploy-worker/src/index.js` through `deploy-worker/wrangler.toml`.
2. Current automated tests use `deploy-worker/src/index.js` through `npm run smoke:with-worker` and local Worker helpers.
3. `wrangler dev` in project scripts uses `deploy-worker/wrangler.toml`, not `wrangler.embedded.toml`.
4. `wrangler deploy` could use either config depending on the human command. The repository does not prove a single production deploy command.
5. `package.json` dry-runs both entrypoints.
6. Staging deploy entrypoint is not formally defined.
7. Production deploy entrypoint is not formally defined beyond available Wrangler configs.
8. `src/index.embedded.js` is a generated deployable artifact, not the canonical source.
9. The embedded artifact is stale relative to source for P0-002C.
10. Multiple Worker entrypoints exist: source with Assets binding and embedded fallback artifact.
11. Current local verification does not cover the embedded artifact at runtime.
12. A production or staging deploy using `wrangler.embedded.toml` could omit `/api/staging/handover/commit`.
13. Staging/production deploy should be blocked until the deploy entrypoint is explicitly selected and the embedded drift gate is resolved or embedded is confirmed unused.

## Current Risk Position

- Local/source Worker validation can continue.
- Any deployment through `deploy-worker/wrangler.embedded.toml` is NO-GO until controlled generation and human diff review are approved.
- Production deploy is NO-GO until a single deploy entrypoint is chosen and checked by `npm run audit:worker-drift`, `npm run verify:embedded-worker`, and `npm run build:embedded:dry-run`.
