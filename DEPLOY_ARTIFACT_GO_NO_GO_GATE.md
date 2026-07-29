# Deploy Artifact GO / NO-GO Gate

Date: 2026-05-24, Asia/Dubai

Scope: P1-006 deploy-artifact gate for source Worker vs embedded Worker drift. No deployment was executed.

## GO For Local Development

- `deploy-worker/wrangler.toml` points to `src/index.js`.
- `npm run smoke:with-worker` validates the source Worker locally.
- `npm run verify:clean-d1` validates source Worker behavior with disposable local D1.
- P0-002C staging endpoint can continue local validation through the source Worker.

## GO For Staging Deploy Prep

Allowed only after:

1. Human selects source or embedded deployment entrypoint.
2. `npm run audit:worker-drift` has been reviewed.
3. `npm run verify:embedded-worker` has been reviewed.
4. `npm run build:embedded:dry-run` has been reviewed if embedded config may be used.
5. Secret scan passes.
6. Dashboard unchanged and legacy table unchanged checks pass.
7. No production config or production D1 operation is included.

## NO-GO For Staging Deploy

- Actual deploy entrypoint is not confirmed.
- Embedded config is selected but `src/index.embedded.js` is stale.
- Embedded artifact lacks `/api/staging/handover/commit`.
- Embedded artifact lacks `ENABLE_HANDOVER_ATOMIC_STAGING`.
- Embedded artifact lacks staging handover persistence table references.
- Dry-run diff has not been reviewed.
- Staging D1 / KV / secrets are not separated from production.

## NO-GO For Production Deploy

- `src/index.embedded.js` is stale and embedded config may be used.
- Production disabled guard for staging endpoint cannot be proven in the deployed artifact.
- Delete-session void behavior cannot be proven in the deployed artifact.
- Production migration or remote D1 operation is required.
- P0-001 money precision, P0-006 tenant isolation, and P0-008 receivables remain unresolved for commercial rollout.
- Human approval and rollback plan are missing.

## Current Gate Result

- Local source Worker development: GO.
- Staging deploy using source Worker: MANUAL_REQUIRED because deployment environment is not confirmed.
- Staging deploy using embedded Worker: MANUAL_REQUIRED after P1-006B controlled write; route/guard freshness is verified, but real staging resources and deployment approval are still missing.
- Production deploy: NO-GO.

## P1-006B Controlled Write Update

Date: 2026-05-24, Asia/Dubai

Controlled write completed for `deploy-worker/src/index.embedded.js`.

Verified:

1. `npm run audit:worker-drift` reports 0 critical mismatches and 0 route mismatches.
2. `npm run verify:embedded-worker` reports `PASS`.
3. `npm run build:embedded:dry-run` reports `PASS`.
4. `npm run smoke:embedded-with-worker` reports `PASS`.
5. `/api/staging/handover/commit` exists in the embedded artifact.
6. `ENABLE_HANDOVER_ATOMIC_STAGING` and `HSC_ALLOWED_APP_ENVS` exist in the embedded artifact.
7. `/api/delete_session` void markers remain in the embedded artifact.

This update does not approve staging or production deployment. Staging deploy still requires separate Cloudflare resource confirmation, human approval, and a deploy-specific smoke run.
