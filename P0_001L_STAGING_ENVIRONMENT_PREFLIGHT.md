# P0-001L Staging Environment Preflight

Generated: 2026-05-25T03:42:25+04:00

Scope: P0-001L real staging QA preflight for employee entry adapter rehearsal. This is a readiness check only. It does not deploy, migrate, or write staging data.

## Summary

Current repo evidence is sufficient for local/staging QA planning, but not sufficient to execute real staging writes. The current checked-in Wrangler configs still point at the same Worker name, D1 database, KV namespace, and static `CORPID`. No reviewed staging Worker URL, staging D1 target, staging backup, rollback confirmation, or staging test credentials were found in committed non-secret config.

Result: `MANUAL_REQUIRED`

## Preflight Table

| Item                                            | Found | Value / Location                                                                                 | Risk                                                                 | Action                                                                |
| ----------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Staging Worker URL                              | No    | Not found in committed config                                                                    | Cannot run real staging API QA without guessing endpoint             | Human must provide reviewed staging URL                               |
| Staging Worker name                             | Plan  | `ENVIRONMENT_SEPARATION_PLAN.md` target: `homelink-finance-staging`                              | Plan exists, actual Cloudflare resource not confirmed                | Human must confirm actual Worker name                                 |
| Staging D1 database name                        | Plan  | `ENVIRONMENT_SEPARATION_PLAN.md` target: `homelink-staging`                                      | Plan exists, actual D1 database and id not confirmed                 | Human must confirm staging D1 name/id and backup status               |
| Staging D1 backup plan                          | No    | Not found as approved operational evidence                                                       | Real staging writes should not run without rollback/backup evidence  | Human must provide backup/export procedure                            |
| Staging rollback plan                           | Plan  | `ENVIRONMENT_SEPARATION_PLAN.md`, `STAGING_VALIDATION_PLAN.md`, P0-001K rollback local rehearsal | Production/staging rollback not actually exercised                   | Human must confirm rollback command and owner                         |
| Staging entrypoint                              | No    | Source and embedded entrypoints documented, actual staging entrypoint not confirmed              | Wrong artifact could make staging behavior differ from local tests   | Human must confirm `wrangler.toml` vs `wrangler.embedded.toml` usage  |
| `APP_ENV=staging` setting                       | Plan  | `ENVIRONMENT_SEPARATION_PLAN.md`; not present in checked-in Wrangler vars                        | Feature flags and safety gates depend on correct runtime env         | Human must confirm staging secret/var configuration                   |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true` | Plan  | P0-001J/K docs and tests                                                                         | Real staging adapter cannot run without explicit non-production flag | Human must confirm staging-only flag operation                        |
| Staging employee test account                   | No    | No committed secret/test credential                                                              | Cannot run authenticated employee QA without credential              | Human must provide staging employee account via secure channel        |
| Staging owner test account                      | No    | No committed secret/test credential                                                              | Cannot verify owner/admin denial and dashboard snapshots             | Human must provide staging owner/admin account via secure channel     |
| Production disabled behavior                    | Yes   | `tests/employee-entry-production-behavior-lock.spec.mjs`, P0-001J/K reports                      | Local evidence only; production not touched                          | Re-run against staging/prod-like config before cutover                |
| Feature flag off rollback                       | Yes   | `EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md`, `npm run rehearse:employee-entry-rollback`            | Local evidence only                                                  | Re-run in real staging after backup                                   |
| Embedded artifact critical route parity         | Yes   | `npm run audit:worker-drift`, `npm run verify:embedded-worker`, `npm run build:embedded:dry-run` | Dry-run warning remains, though 0 critical missing                   | Human deploy-prep review required before any staging/prod deploy      |
| Remote write approval                           | No    | Explicitly prohibited by Night Shift V4                                                          | Real staging write would violate safe default                        | Require `--confirm-staging-write --confirm-backup --confirm-rollback` |

## Gate Decision

GO for local dry-run QA package: yes.

GO for real staging write QA: no, until human supplies and approves:

- reviewed staging Worker URL;
- staging Worker entrypoint;
- staging D1 database name/id;
- staging D1 backup evidence;
- rollback command or rollback procedure;
- staging employee test credential;
- staging owner/admin test credential;
- confirmation that staging is not production.

Production cutover remains NO-GO.
