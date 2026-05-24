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
- Staging deploy using embedded Worker: NO-GO until controlled write is approved and verified.
- Production deploy: NO-GO.
