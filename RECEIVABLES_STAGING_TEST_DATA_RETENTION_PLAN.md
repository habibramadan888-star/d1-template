# Receivables Staging Test Data Retention Plan

Generated: 2026-05-25, Asia/Dubai

QA run id: `P0-008E-20260525-STAGING-SHADOW-001`

## Retention Decision

P0-008E is allowed to write staging-only QA rows to `homelink-finance-staging` after explicit confirmation. These rows should be retained temporarily as evidence for due/overdue/repayment/adjustment receivables shadow behavior.

## Tables

| Table          | Row Marker                 | Purpose                                                                                               |
| -------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `arrear_tasks` | `task_id LIKE 'p0_008e_%'` | due today, overdue, short pay, partial repayment, full repayment, adjustment credit, adjustment debit |
| `transactions` | `id LIKE 'p0_008e_%'`      | voided payment impact and deposit exclusion                                                           |

## Why Retain

- The rows close the P0-008D `NEEDS_MORE_DATA` gap.
- They support repeatable staging shadow comparison.
- They show receivables behavior without production migration or dashboard live switch.
- They are isolated by QA run id and `corpid=p0-008e-shadow`.

## Cleanup Requirements

Cleanup must be a separate staging-only task.

Before cleanup:

1. Confirm target D1 is `homelink-finance-staging`.
2. Confirm target D1 id is `4ff78bfc-3855-436b-aefb-6b492145d79c`.
3. Run a staging D1 backup/export.
4. Confirm production URL/D1 is excluded.
5. Confirm cleanup only targets `p0_008e_%` rows.

## Cleanup Command Draft

Do not run in this task.

```powershell
npx wrangler d1 execute homelink-finance-staging --remote --command "DELETE FROM arrear_tasks WHERE task_id LIKE 'p0_008e_%';"
npx wrangler d1 execute homelink-finance-staging --remote --command "DELETE FROM transactions WHERE id LIKE 'p0_008e_%';"
```

## Production Safety

- Production cleanup is forbidden.
- Production migration is forbidden.
- Production deploy is forbidden.
- Dashboard live switch is forbidden.
