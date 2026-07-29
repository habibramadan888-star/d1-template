# P0-006S Tenant Scope Production Approval Packet

Date: 2026-05-26, Asia/Dubai

Result: `MANUAL_REQUIRED`

Commercial launch gate: `PRODUCTION_NO_GO`

P0-006 status:

- `Partial - tenant scope production approval packet prepared, production NO-GO`

Scope: approval packet only. This task does not approve or execute production
deploy, production migration, remote production D1 migration, production D1
write, production URL calls, production feature flag enablement, production
auth/session switch, production route/query switch, legacy CORPID fallback
removal, or production cutover.

## Production D1 Target Confirmation Requirements

Before any production tenant scope work, a human reviewer must provide and
approve the exact production D1 target.

| Item               | Required Confirmation                                                | Status          |
| ------------------ | -------------------------------------------------------------------- | --------------- |
| Production D1 name | Exact production database name, not staging, not template            | MANUAL_REQUIRED |
| Production D1 id   | Exact production database id from Cloudflare/Wrangler                | MANUAL_REQUIRED |
| Environment        | Must be production only after approval, never inferred               | MANUAL_REQUIRED |
| Excluded targets   | `homelink-finance-staging`, `d1-template-database`, local/dev DBs    | REQUIRED        |
| Command review     | Every command must show the approved production D1 target explicitly | MANUAL_REQUIRED |

No production D1 command is allowed until these confirmations are complete.

## Production Backup Requirements

| Requirement                                       | Approval Needed | Notes                                                      |
| ------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| Full production D1 export before schema migration | Yes             | Backup path and timestamp must be recorded.                |
| Backup file excluded from git                     | Yes             | Backup must not be committed.                              |
| Restore procedure documented                      | Yes             | Restore command and verification queries must be reviewed. |
| Restore rehearsal or operator signoff             | Yes             | Staging restore evidence is not enough for production.     |
| Backup integrity check                            | Yes             | File existence and non-zero size are required at minimum.  |

Required approval flag before any production action:

- `--confirm-production-backup`

## Production Schema Migration Approval Checklist

Schema migration approval is limited to nullable compatibility columns unless a
separate reviewed production migration plan explicitly says otherwise.

| Check                       | Required Result                                           | Status          |
| --------------------------- | --------------------------------------------------------- | --------------- |
| SQL file reviewed           | Only approved `ALTER TABLE ... ADD COLUMN` / safe indexes | MANUAL_REQUIRED |
| Contains `DROP`             | No                                                        | REQUIRED        |
| Contains `DELETE`           | No                                                        | REQUIRED        |
| Contains `UPDATE`           | No for schema step                                        | REQUIRED        |
| Contains `INSERT`           | No for schema step                                        | REQUIRED        |
| Destructive PRAGMA          | No                                                        | REQUIRED        |
| `NOT NULL` without default  | No                                                        | REQUIRED        |
| Legacy CORPID removal       | No                                                        | REQUIRED        |
| Existing row mutation       | No                                                        | REQUIRED        |
| Production target confirmed | Yes                                                       | MANUAL_REQUIRED |

Required approval flag before production schema migration:

- `--confirm-production-tenant-scope-schema-migration`

## Production Row-Level Backfill Approval Checklist

Production row-level backfill must be separately approved after schema
migration and backup confirmation.

| Check                       | Required Result                                                                        | Status          |
| --------------------------- | -------------------------------------------------------------------------------------- | --------------- |
| Exact mapping reviewed      | Table, target field, source rule, and WHERE clause reviewed                            | MANUAL_REQUIRED |
| Row counts estimated        | Every UPDATE has a preflight count                                                     | MANUAL_REQUIRED |
| WHERE clause present        | Required for every UPDATE                                                              | REQUIRED        |
| Compatibility columns only  | `tenant_id`, `property_id`, `corp_id`, `owner_id`, `employee_id` as approved by schema | MANUAL_REQUIRED |
| Legacy fields preserved     | Existing legacy CORPID/source fields unchanged                                         | REQUIRED        |
| Financial fields unchanged  | No amount/date/dashboard formula mutation                                              | REQUIRED        |
| Manual rows excluded        | Any MANUAL_REQUIRED mapping must not be updated                                        | REQUIRED        |
| Production dry-run evidence | Required before write                                                                  | MANUAL_REQUIRED |

Required approval flags before production row-level backfill:

- `--confirm-production-tenant-scope-backfill-write`
- `--confirm-production-exact-mapping-reviewed`
- `--confirm-production-row-counts-reviewed`

## Production Rollback Checklist

| Rollback Area   | Required Plan                                                                  | Status          |
| --------------- | ------------------------------------------------------------------------------ | --------------- |
| Backup restore  | Restore production D1 from approved backup                                     | MANUAL_REQUIRED |
| Reverse updates | Exact reverse UPDATE plan for compatibility columns where safe                 | MANUAL_REQUIRED |
| Feature flags   | Disable tenant scope auth/route/query production switches                      | MANUAL_REQUIRED |
| Legacy fallback | Keep legacy CORPID fallback available during rollback                          | REQUIRED        |
| Verification    | Cross-tenant/cross-property denial, dashboard unchanged, gate still controlled | MANUAL_REQUIRED |
| Stop criteria   | Any failed verification stops cutover and triggers rollback decision           | MANUAL_REQUIRED |

Required approval flag:

- `--confirm-production-rollback-plan-reviewed`

## Auth / Session Claim Production Switch Checklist

| Claim Area                             | Requirement                                                     | Status          |
| -------------------------------------- | --------------------------------------------------------------- | --------------- |
| `tenant_id`                            | Authoritative from server-side auth/session, not frontend input | MANUAL_REQUIRED |
| `property_id` / `allowed_property_ids` | Server-side role/resource constraints                           | MANUAL_REQUIRED |
| `role`                                 | Employee / owner / manager / admin semantics reviewed           | MANUAL_REQUIRED |
| `employee_id`                          | Required for employee-scoped resources where applicable         | MANUAL_REQUIRED |
| `owner_id`                             | Required for owner-scoped resources where applicable            | MANUAL_REQUIRED |
| `corp_id`                              | Legacy fallback only, warning-only, not final SaaS authority    | REQUIRED        |
| Missing tenant claim                   | Must deny tenant-scoped production access                       | REQUIRED        |
| Frontend tenant tamper                 | Must be ignored as authority                                    | REQUIRED        |
| Session/JWT expiry                     | Reviewed and tested                                             | MANUAL_REQUIRED |

Required approval flag:

- `--confirm-production-auth-claim-switch`

## Route / Query Production Switch Checklist

| Route / Query Area     | Requirement                                             | Status          |
| ---------------------- | ------------------------------------------------------- | --------------- |
| Employee entry         | Tenant/property claim drives scope                      | MANUAL_REQUIRED |
| Handover               | Tenant/property claim drives scope                      | MANUAL_REQUIRED |
| Sessions               | Tenant/property filters reviewed                        | MANUAL_REQUIRED |
| Transactions           | Tenant/property filters reviewed                        | MANUAL_REQUIRED |
| Deposit ledger         | Tenant/property filters reviewed                        | MANUAL_REQUIRED |
| Arrears / arrear tasks | Tenant/property filters reviewed                        | MANUAL_REQUIRED |
| Audit logs             | Tenant/property visibility reviewed                     | MANUAL_REQUIRED |
| Entry events           | Tenant/property visibility reviewed                     | MANUAL_REQUIRED |
| Dashboard/history      | No unapproved live formula or response mutation         | MANUAL_REQUIRED |
| Settings/app_settings  | Tenant model decision required before production switch | MANUAL_REQUIRED |

Required approval flags:

- `--confirm-production-route-query-switch`
- `--confirm-production-dashboard-history-scope-reviewed`

## Legacy CORPID Fallback Policy

Legacy CORPID fallback must remain available until production tenant scope is
fully verified and rollback-safe.

| Policy Item                                   | Decision          |
| --------------------------------------------- | ----------------- |
| CORPID as final SaaS authority                | NO                |
| CORPID as temporary compatibility fallback    | YES, warning-only |
| Remove legacy CORPID fields                   | NO                |
| Remove legacy tables                          | NO                |
| Use frontend CORPID/tenant input as authority | NO                |
| Production switch without fallback rollback   | NO                |

Required approval flag:

- `--confirm-legacy-corpid-fallback-policy-reviewed`

## Accounting / Data Review Requirements

Tenant scope production approval must not be separated from accounting/data
review because scoped rows affect financial visibility.

| Area                    | Review Needed | Notes                                                                    |
| ----------------------- | ------------- | ------------------------------------------------------------------------ |
| Sessions                | Yes           | Scope filters must not hide or duplicate active records.                 |
| Transactions            | Yes           | No amount changes; visibility only.                                      |
| Deposit ledger          | Yes           | Deposit handling must remain consistent.                                 |
| Arrears / receivables   | Yes           | P0-008 and accounting review remain relevant.                            |
| Audit/event rows        | Yes           | Audit visibility must preserve compliance evidence.                      |
| Dashboard/history       | Yes           | Dashboard result must not become frontend authority.                     |
| Rollback reconciliation | Yes           | Post-rollback accounting visibility must match expected legacy behavior. |

Required approval flag:

- `--confirm-accounting-data-review`

## Explicit Human Approval Flags Required

No production tenant scope action is allowed without an explicit prompt that
contains all relevant flags for that action.

Minimum flags before any production schema/backfill attempt:

- `--confirm-production-d1-target`
- `--confirm-production-backup`
- `--confirm-production-tenant-scope-schema-migration`
- `--confirm-production-rollback-plan-reviewed`
- `--confirm-production-exact-mapping-reviewed`
- `--confirm-production-row-counts-reviewed`
- `--confirm-legacy-corpid-fallback-policy-reviewed`
- `--confirm-accounting-data-review`

Additional flags before any production runtime switch:

- `--confirm-production-auth-claim-switch`
- `--confirm-production-route-query-switch`
- `--confirm-production-dashboard-history-scope-reviewed`
- `--confirm-production-feature-flag-rollback`

## Current Decision

| Decision Area                                 | Result             |
| --------------------------------------------- | ------------------ |
| Production approval packet prepared           | YES                |
| Production deploy approved                    | NO                 |
| Production migration approved                 | NO                 |
| Production D1 write approved                  | NO                 |
| Production auth/session claim switch approved | NO                 |
| Production route/query switch approved        | NO                 |
| Production cutover approved                   | NO                 |
| Commercial launch gate                        | `PRODUCTION_NO_GO` |

Conclusion: P0-006S prepares the manual approval packet only. P0-006 remains
Partial, not Verified. Production remains `NO-GO`.

## Validation

| Command                             | Result                           | Notes                                                        |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| `npm run check`                     | PASS                             | 404 tests passed; build commands were Wrangler dry-run only. |
| `npm run security:secrets`          | PASS                             | No secret committed.                                         |
| `npm run gate:commercial-launch`    | `PRODUCTION_NO_GO`               | Production remains blocked.                                  |
| `npm run qa:employee-entry-staging` | `MANUAL_REQUIRED / DRY_RUN_ONLY` | No staging employee write executed.                          |
| `npm run audit:worker-drift`        | PASS                             | 0 critical mismatches.                                       |
| `npm run verify:embedded-worker`    | PASS                             | 0 critical missing.                                          |
| `npm run build:embedded:dry-run`    | WARNING                          | 0 current/generated missing; dry-run only.                   |
