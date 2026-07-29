# Worker Drift CI Gate Plan

Date: 2026-05-24, Asia/Dubai

P1-006 added read-only worker drift checks. They are not added to `npm run check` as hard failures yet because the current state is intentionally `MANUAL_REQUIRED`, and making the general check fail would block unrelated local safety work.

## New Commands

| Command                          | Purpose                                                              | Mutates Files                                                                             | Intended Use           |
| -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| `npm run audit:worker-drift`     | Compare source Worker and embedded artifact routes / critical guards | Writes `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`                                                 | Deploy prep and review |
| `npm run verify:embedded-worker` | Compute hashes and freshness status                                  | Writes `EMBEDDED_WORKER_FRESHNESS_RESULT.md` and `.tmp/embedded-worker-freshness.json`    | Deploy prep and review |
| `npm run build:embedded:dry-run` | Generate a candidate embedded artifact under `.tmp`                  | Writes `.tmp/embedded-worker-dry-run/` and `EMBEDDED_WORKER_GENERATION_DRY_RUN_RESULT.md` | Human diff review only |

## Recommended CI Behavior

Before staging or production deploy, CI or deploy-prep must run:

```text
npm run audit:worker-drift
npm run verify:embedded-worker
npm run build:embedded:dry-run
npm run security:secrets
```

## Blocking Rules For Deploy-Prep

- Block if the actual deploy entrypoint is unknown.
- Block if embedded config is selected and embedded artifact lacks critical source behavior.
- Block if dry-run generation differs from the tracked artifact and no human review approval is attached.
- Block if secret scan fails.
- Block if production deployment is attempted from an unreviewed embedded artifact.

## Why Not In `npm run check` Yet

`npm run check` is a local commercial safety gate. The embedded artifact is currently stale by design and needs human approval before controlled write. Failing every local check would prevent safe P0/P1 preparation work. The correct place to make this hard-blocking is deploy-prep CI after a single deploy entrypoint is selected.
