# Unified Login Style Deploy Approval Required

Date: 2026-05-28, Asia/Dubai

Production status: `PRODUCTION_NO_GO`.

## Scope

This task changes the static visual presentation of `unified-login.html` so the
only login entry matches the original employee login page design.

Deploy is required before the live URL reflects the new visual style:

`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`

## Dry-Run Results

| Check                            | Result                         | Notes                                                                  |
| -------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `npm run build:embedded:dry-run` | WARNING                        | Current/generated missing counts are both 0.                           |
| `npm run verify:embedded-worker` | PASS                           | Missing critical assets: 0.                                            |
| `npm run audit:worker-drift`     | PASS_WITH_KNOWN_ROUTE_MISMATCH | Critical mismatches: 0; route mismatches: 1 tracked by existing audit. |

## Deploy Boundary

Deploy may be considered only under a separate explicit approval and only for
static unified-login UI assets.

| Item                         | Allowed By This Task |
| ---------------------------- | -------------------: |
| Production D1 write          |                   No |
| Production migration         |                   No |
| D1 export/import/execute     |                   No |
| Dashboard calculation change |                   No |
| Financial formula change     |                   No |
| Business write flow change   |                   No |
| Commercial launch GO         |                   No |

## Recommendation

Run manual screenshot QA first. If approved, perform a static UI-only Worker
deploy task with the same no-D1/no-migration boundary.
