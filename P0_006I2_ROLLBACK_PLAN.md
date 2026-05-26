# P0-006I2 Rollback Plan

Date: 2026-05-26, Asia/Dubai

Rollback was not executed because post-write verification passed.

## Backup Restore Method

Use the pre-write staging backup:

```powershell
./backups/homelink-finance-staging-before-tenant-scope-backfill.sql
```

If a full rollback is required, restore this backup only to
`homelink-finance-staging` after confirming the D1 name and id:

- Name: `homelink-finance-staging`
- Id: `4ff78bfc-3855-436b-aefb-6b492145d79c`

Production restore is forbidden.

## Reverse Update Method

If a narrow rollback is preferred and backup restore is not required, use exact
inverse updates only for the reviewed rows changed in P0-006I2:

- Set `sessions.company_id`, `sessions.property_id`, `sessions.employee_id` to
  `NULL` for the reviewed staging QA session id.
- Set `transactions.company_id`, `transactions.property_id`,
  `transactions.employee_id` to `NULL` for the reviewed staging QA transaction
  id.
- Set `entry_events.company_id`, `entry_events.property_id`,
  `entry_events.employee_id` to `NULL` for the reviewed event ids updated in
  this task.
- Set `audit_logs.company_id`, `audit_logs.property_id`,
  `audit_logs.employee_id` to `NULL` for the reviewed audit ids updated in this
  task.

Every inverse update must include a primary-key `WHERE` clause.

## When Rollback Should Be Used

- Expected row counts do not match actual updates.
- Financial totals change unexpectedly.
- Manual-required tables are touched.
- Production target is detected.
- Dashboard/history behavior changes unexpectedly.

## How To Verify Rollback

1. Re-run the after snapshot queries.
2. Confirm READY_TO_WRITE rows are back to pre-write scope state.
3. Confirm transaction row count and amount sums match the pre-write snapshot.
4. Run `npm run dry-run:tenant-scope-staging-backfill`.
5. Run `npm run gate:commercial-launch` and confirm `PRODUCTION_NO_GO`.

## Why Rollback Was Not Executed

- Expected rows were updated.
- No unexpected rows were updated.
- Manual-required rows remained untouched.
- Financial totals and row counts were unchanged.
- Production was untouched.
