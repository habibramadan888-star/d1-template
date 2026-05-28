# Owner UX Stabilization Deploy Result

Date: 2026-05-28, Asia/Dubai

| Item                          | Result                                                       |
| ----------------------------- | ------------------------------------------------------------ |
| Deploy executed               | yes                                                          |
| Target Worker                 | `homelink-finance`                                           |
| Deploy command                | `npx wrangler deploy --config wrangler.toml --env=""`        |
| Current Version ID            | `afa2df31-efc4-4345-93be-c21b4042855b`                       |
| Static assets uploaded        | `/unified-login.html`, `/index-51.html`, `/index-51-main.js` |
| D1 write                      | no                                                           |
| Migration                     | no                                                           |
| D1 export/import/execute      | no                                                           |
| Employee entry write          | no                                                           |
| Handover submit               | no                                                           |
| Void/delete                   | no                                                           |
| Settings change               | no                                                           |
| Dashboard calculation changed | no                                                           |
| Financial formula changed     | no                                                           |
| Production cutover            | `PRODUCTION_NO_GO`                                           |

## Pre-Deploy Verification

| Check                            | Result                                               |
| -------------------------------- | ---------------------------------------------------- |
| `npm run format:check`           | PASS                                                 |
| `npm run check`                  | PASS, 517 tests                                      |
| `npm run security:secrets`       | PASS                                                 |
| `npm run gate:commercial-launch` | `PRODUCTION_NO_GO`                                   |
| `npm run build:embedded:dry-run` | WARNING, no missing current/generated critical files |
| `npm run verify:embedded-worker` | PASS                                                 |
| `npm run audit:worker-drift`     | 0 critical mismatches                                |

Deployment was limited to UI/static asset and read-only history first-load support. No D1 migration or business write command was run.
