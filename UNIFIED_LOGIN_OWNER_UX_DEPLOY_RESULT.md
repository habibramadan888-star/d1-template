# Unified Login Owner UX Deploy Result

Date: 2026-05-28, Asia/Dubai

Status: Deployed.

| Item                     | Result                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| Deploy scope             | Owner auth loading and unified-login back-button UX assets only   |
| Target Worker            | `homelink-finance`                                                |
| Deploy command           | `npx wrangler deploy --config wrangler.toml --env="" --keep-vars` |
| Uploaded assets          | `/unified-login.html`, `/index-51.html`, `/index-51-main.js`      |
| Version ID               | `fd97ca00-7f6a-43b5-b223-5d062b5374ca`                            |
| Production D1 write      | No                                                                |
| Migration                | No                                                                |
| D1 export/import/execute | No                                                                |
| Dashboard formula change | No                                                                |
| Financial formula change | No                                                                |
| Production cutover       | `PRODUCTION_NO_GO`                                                |

## Pre-Deploy Verification

| Command                                      | Result                           |
| -------------------------------------------- | -------------------------------- |
| `npm run format:check`                       | PASS                             |
| `npm run check`                              | PASS, 441 tests                  |
| `npm run security:secrets`                   | PASS                             |
| `npm run gate:commercial-launch`             | `PRODUCTION_NO_GO`               |
| `npm run test:unified-login`                 | PASS                             |
| `npm run test:unified-login-session-handoff` | PASS                             |
| `npm run test:unified-login-auth-guard`      | PASS                             |
| `npm run test:unified-login-owner-ux`        | PASS                             |
| `npm run qa:employee-entry-staging`          | `MANUAL_REQUIRED / DRY_RUN_ONLY` |
| `npm run build:embedded:dry-run`             | WARNING, 0 missing               |
| `npm run verify:embedded-worker`             | PASS                             |
| `npm run audit:worker-drift`                 | PASS, 0 critical mismatches      |

Successful owner/employee credential login was not executed by Codex because it
can create a production D1 `active_sessions` row. That requires separate
approval.
