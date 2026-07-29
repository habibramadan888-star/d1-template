# P0-006I Schema Compatibility Backup Rollback Checklist

Date: 2026-05-26, Asia/Dubai

Scope: checklist only. Backup, migration, and rollback were not executed in
this gate.

## Backup Required Before Staging Schema Migration

SAFE_TO_RUN_NOW: no

NEEDS_HUMAN_APPROVAL: yes

WRITES_SCHEMA: no for this checklist; yes in a future schema migration task

WRITES_DATA: no

PRODUCTION_FORBIDDEN: yes

```powershell
npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-tenant-scope-compatibility-schema.sql
```

## Target Confirmation

| Check                | Required Value                         |
| -------------------- | -------------------------------------- |
| D1 name              | `homelink-finance-staging`             |
| D1 id                | `4ff78bfc-3855-436b-aefb-6b492145d79c` |
| Production D1        | forbidden                              |
| Production migration | forbidden                              |
| Production deploy    | forbidden                              |

## Rollback Options

| Option                                                       | Use When                                                | Notes                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Restore staging D1 backup                                    | Schema migration unexpectedly breaks staging validation | Preferred for staging-only rollback if no later writes should be preserved. |
| Rebuild staging from known migrations + retained QA evidence | Backup restore is not acceptable                        | Requires human approval and evidence retention decision.                    |
| Forward-fix nullable compatibility columns                   | Only if failure is a harmless additive metadata issue   | Must be reviewed; do not use for production.                                |

SQLite/D1 cannot reliably drop arbitrary columns in a reversible way across all
environments. Treat backup restore as the primary rollback method.

## Verification After Rollback

1. Confirm target D1 is still `homelink-finance-staging`.
2. Run schema snapshot SELECT for `sqlite_schema`.
3. Confirm compatibility columns were removed or staging restored as expected.
4. Run `npm run check`.
5. Run `npm run qa:employee-entry-staging` without confirmation flags and
   confirm `DRY_RUN_ONLY` / `MANUAL_REQUIRED`.
6. Run `npm run gate:commercial-launch` and confirm `PRODUCTION_NO_GO`.

## What Not To Commit

- Backup SQL files.
- `.tmp/` files.
- Secrets, passwords, tokens, cookies.
- Any production config change.

## Production Forbidden Commands

- Any `wrangler d1 migrations apply` targeting production.
- Any `wrangler d1 execute` targeting production.
- Any production deploy.
- Any production feature flag enablement.
