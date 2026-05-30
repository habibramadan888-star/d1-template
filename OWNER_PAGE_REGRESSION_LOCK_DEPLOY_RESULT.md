# Owner Page Regression Lock Deploy Result

Date: 2026-05-30, Asia/Dubai

## Status

Deployed static UI fix to production Worker after read-only preflight passed.

## Deployment

| Item                    | Result                                                 |
| ----------------------- | ------------------------------------------------------ |
| Source commit           | `e717a3e`                                              |
| Worker                  | `homelink-finance`                                     |
| URL                     | `https://homelink-finance.habibramadan888.workers.dev` |
| Version ID              | `a63b58ea-9e58-461b-981e-d4198b8e46ea`                 |
| Assets uploaded         | `/index.html`, `/index-51.html`, `/index-51-main.js`   |
| D1 command executed     | no                                                     |
| Migration executed      | no                                                     |
| Business write executed | no                                                     |

Wrangler emitted the expected warning that multiple environments exist and no `--env` was supplied. This deploy intentionally targeted the top-level/default production Worker.

## Deploy Preconditions

Before any static UI deploy, run:

- `npm run build:embedded:dry-run`
- `npm run verify:embedded-worker`
- `npm run audit:worker-drift`
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- owner regression tests

## Preflight Results

| Command                                        | Result                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run test:owner-overview-no-quick-actions` | PASS, 3/3                                                                 |
| `npm run test:owner-arrears-entry`             | PASS, 3/3                                                                 |
| `npm run test:owner-arrears-info-pool`         | PASS, 3/3                                                                 |
| `npm run security:secrets`                     | PASS                                                                      |
| `npm run gate:commercial-launch`               | `PRODUCTION_NO_GO`, `NO_GO=12`, `MANUAL_REQUIRED=1`                       |
| `npm run qa:employee-entry-staging`            | `MANUAL_REQUIRED`, `DRY_RUN_ONLY`                                         |
| `npm run build:embedded:dry-run`               | PASS                                                                      |
| `npm run verify:embedded-worker`               | PASS                                                                      |
| `npm run audit:worker-drift`                   | PASS, `WORKER_DRIFT_CRITICAL_MISMATCHES=0`                                |
| `npm run format:check`                         | FAIL on existing repository baseline, 897 pre-existing style warnings     |
| `npm run check`                                | FAIL because it includes the same full-repository `format:check` baseline |

Scoped Prettier check for the files touched by this task passed.

## Prohibited Operations

- D1 write: prohibited
- Migration: prohibited
- D1 export/import/execute: prohibited
- Business write: prohibited
- Dashboard calculation change: prohibited
- Financial formula change: prohibited

## Production Cutover

Production cutover remains `PRODUCTION_NO_GO`.
