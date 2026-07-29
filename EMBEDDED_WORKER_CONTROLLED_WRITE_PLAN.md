# Embedded Worker Controlled Write Plan

Date: 2026-05-24, Asia/Dubai

This plan is for a future explicit task only. P1-006 did not overwrite `deploy-worker/src/index.embedded.js`.

## Preconditions

1. Human confirms whether `deploy-worker/wrangler.embedded.toml` is required for staging or production.
2. Human reviews `DEPLOY_ENTRYPOINT_REVIEW.md`, `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`, and `EMBEDDED_WORKER_FRESHNESS_RESULT.md`.
3. Human approves controlled artifact write after dry-run diff review.
4. No production deploy is included in the controlled write task.

## Controlled Write Workflow

1. Run `npm run check`.
2. Run `npm run smoke:with-worker`.
3. Run `npm run verify:clean-d1`.
4. Run `npm run test:handover-staging-endpoint`.
5. Run `npm run rehearse:handover-staging-endpoint`.
6. Run `npm run verify:dashboard-unchanged`.
7. Run `npm run verify:handover-legacy-unchanged`.
8. Run `npm run audit:worker-drift`.
9. Run `npm run verify:embedded-worker`.
10. Run `npm run build:embedded:dry-run`.
11. Review `.tmp/embedded-worker-dry-run/index.embedded.generated.js`.
12. Review diff against `deploy-worker/src/index.embedded.js`.
13. Run `npm run security:secrets`.
14. If approved, execute a separate controlled write command in a future task.
15. After write, rerun the full validation sequence.
16. Commit only the generated artifact and report updates.
17. Keep rollback available with `git restore -- deploy-worker/src/index.embedded.js` before commit, or git revert after commit.

## Production Deploy Forbidden Conditions

- Deploy entrypoint is unknown.
- Embedded artifact lacks `/api/staging/handover/commit` while embedded config is selected.
- Embedded artifact lacks delete-session void behavior.
- Embedded artifact lacks staging feature flag guard.
- Embedded artifact lacks production-disabled behavior.
- Source/embedded drift was not reviewed.
- Secret scan was not run.
- Production D1 migration is required but not approved.
- Human approval is missing.

## Rollback

- Before commit: `git restore -- deploy-worker/src/index.embedded.js`
- After commit: revert the controlled write commit.
- Do not use rollback as a substitute for deploy gate review.

## P1-006B Execution Note

Date: 2026-05-24, Asia/Dubai

This controlled write plan was executed under task P1-006B.

Result:

- `deploy-worker/src/index.embedded.js` was refreshed from the dry-run generated artifact.
- A backup was created under `.tmp/embedded-worker-backups/`.
- `npm run audit:worker-drift` passed with 0 critical mismatches.
- `npm run verify:embedded-worker` passed.
- `npm run build:embedded:dry-run` passed.
- `npm run smoke:embedded-with-worker` passed.
- No production or staging deploy was executed.
