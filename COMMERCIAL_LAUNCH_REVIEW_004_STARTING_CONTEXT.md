# COMMERCIAL-LAUNCH-REVIEW-004 Starting Context

Date: 2026-05-27, Asia/Dubai

Scope: production-copy dry-run execution planning only. This task does not run
copy migration SQL, copy backfill SQL, production SQL, production deploy,
production migration, production D1 write, staging D1 write, feature flag
changes, or production cutover.

## Current Copy State

| Item               | Value                                                                              | Status          |
| ------------------ | ---------------------------------------------------------------------------------- | --------------- |
| Production D1      | `homelink` / `562aa079-1cca-4176-ba3b-7276a65f98fb`                                | confirmed       |
| Production backup  | `./backups/production-before-copy-dryrun.sql`                                      | exists, ignored |
| Production-copy D1 | `homelink-finance-production-copy-dryrun` / `c461c7f1-47bc-40cf-bbfd-1c03101943bd` | created         |
| Import into copy   | completed                                                                          | pass            |
| Copy validation    | 19 tables; key row counts recorded                                                 | pass            |
| Commercial gate    | `PRODUCTION_NO_GO`                                                                 | no-go           |

## What REVIEW-003 Proved

1. The live production D1 target can be identified without ambiguity.
2. A production export backup can be created under ignored `backups/`.
3. An isolated production-copy D1 exists and is not bound to production Worker.
4. The backup can be imported into the copy.
5. The copy contains the legacy production schema/data snapshot needed for
   future dry-run rehearsal.

## What REVIEW-003 Did Not Prove

1. It did not apply migration SQL.
2. It did not run tenant/property backfill.
3. It did not run money minor-unit conversion.
4. It did not create production receivables / handover authority tables.
5. It did not verify rollback after copy migration/backfill.
6. It did not close accounting, tenant mapping, or TOP_25 money-risk reviews.
7. It did not change production readiness.

## Minimum Safe REVIEW-004 Goal

Prepare an approval-gated execution plan for a future copy-only dry-run. The
plan must define phases, commands, stop conditions, rollback checks, expected
evidence, and approval requirements before any copy SQL is run.

## Absolute Prohibitions

- No production D1 write.
- No production migration.
- No production deploy.
- No production cutover.
- No copy D1 migration/backfill execution in this task.
- No D1 export/import/execute in this task.
- No backup commit.
- No secret/token/cookie logging.
