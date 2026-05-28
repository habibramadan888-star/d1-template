# Unified Login Minimal UI Deploy Result

Date: 2026-05-28, Asia/Dubai

| Item                          | Result                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| Deploy executed               | yes                                                               |
| Target Worker                 | `homelink-finance`                                                |
| Deploy command                | `npx wrangler deploy --config wrangler.toml --env="" --keep-vars` |
| Static asset uploaded         | `/unified-login.html`                                             |
| Worker version ID             | `50d1dd19-3e89-46ec-a0b5-cff3db6d9d9a`                            |
| D1 write                      | no                                                                |
| Migration                     | no                                                                |
| D1 export/import/execute      | no                                                                |
| Employee entry write          | no                                                                |
| Handover submit               | no                                                                |
| Void/delete                   | no                                                                |
| Settings change               | no                                                                |
| Dashboard calculation changed | no                                                                |
| Financial formula changed     | no                                                                |
| Production cutover            | `PRODUCTION_NO_GO`                                                |

Pre-deploy checks completed:

| Check                                        | Result                           |
| -------------------------------------------- | -------------------------------- |
| `npm run check`                              | PASS, 489 tests                  |
| `npm run security:secrets`                   | PASS                             |
| `npm run gate:commercial-launch`             | `PRODUCTION_NO_GO`               |
| `npm run test:unified-login`                 | PASS                             |
| `npm run test:unified-login-single-entry`    | PASS                             |
| `npm run test:unified-login-visual-match`    | PASS                             |
| `npm run test:unified-login-minimal-ui`      | PASS                             |
| `npm run test:unified-login-session-handoff` | PASS                             |
| `npm run test:unified-login-auth-guard`      | PASS                             |
| `npm run test:unified-login-owner-ux`        | PASS                             |
| `npm run qa:employee-entry-staging`          | `MANUAL_REQUIRED / DRY_RUN_ONLY` |
| `npm run build:embedded:dry-run`             | WARNING, 0 missing               |
| `npm run verify:embedded-worker`             | PASS                             |
| `npm run audit:worker-drift`                 | 0 critical mismatches            |
