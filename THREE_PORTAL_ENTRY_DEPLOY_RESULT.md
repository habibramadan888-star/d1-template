# Three Portal Entry Deploy Result

Date: 2026-05-29

## Scope

Deploy scope was limited to the Homelink Finance Worker routing and static UI assets needed for the single-entry three-portal model.

## Result

| Item                          | Result                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| Deploy executed               | yes                                                               |
| Target Worker                 | homelink-finance                                                  |
| Deploy command                | `npx wrangler deploy --config wrangler.toml --env="" --keep-vars` |
| Static assets changed         | yes                                                               |
| Worker route logic changed    | yes                                                               |
| D1 write                      | no                                                                |
| Migration                     | no                                                                |
| D1 export/import/execute      | no                                                                |
| Employee entry write          | no                                                                |
| Handover submit               | no                                                                |
| Void/delete                   | no                                                                |
| Settings change               | no                                                                |
| Dashboard calculation changed | no                                                                |
| Financial formula changed     | no                                                                |
| Production cutover            | PRODUCTION_NO_GO                                                  |

## Pre-Deploy Gates

| Gate                             | Result                                                |
| -------------------------------- | ----------------------------------------------------- |
| `npm run build:embedded:dry-run` | WARNING, no current/generated critical missing checks |
| `npm run verify:embedded-worker` | PASS                                                  |
| `npm run audit:worker-drift`     | PASS, 0 critical mismatches and 0 route mismatches    |

## Deployment Notes

- `run_worker_first = true` was added to the Worker assets config so `/`, legacy `.html` aliases, and authenticated business routes are normalized by Worker route guards before static asset handling.
- Internal asset fetches use clean GET requests so session cookies are not forwarded to the Assets binding.
- No password, token, or cookie was printed in this report.
