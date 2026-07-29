# P0-008E Starting Context

Generated: 2026-05-25, Asia/Dubai

Scope: receivables staging shadow rehearsal. This is not production implementation, production migration, production deploy, production dashboard switch, or P0-008 verification.

## P0-008D Needs More Data Items

| Gap                         | P0-008D Status    | Missing Staging Evidence                                 | P0-008E Plan                                                                             |
| --------------------------- | ----------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| due today                   | `NEEDS_MORE_DATA` | No open receivable due on 2026-05-25                     | Seed one staging-only arrear task due today.                                             |
| overdue amount              | `NEEDS_MORE_DATA` | No open receivable due before 2026-05-25                 | Seed one staging-only overdue arrear task.                                               |
| arrears total / outstanding | `NEEDS_MORE_DATA` | No open arrears/receivable rows with outstanding balance | Seed short-pay and repayment rows with outstanding balances.                             |
| repayment / adjustment      | `NEEDS_MORE_DATA` | No repayment/allocation or adjustment evidence           | Seed partial repayment, full repayment, credit adjustment, and debit adjustment QA rows. |

## Current Staging Data Gap

Current staging QA data is enough to prove rent received/rent due matching, deposit separation, dashboard no-mutation, and no production touch. It is not enough to prove open receivable lifecycle behavior for due-today, overdue, short pay, repayment, and adjustment cases.

## Safe Staging-Only Data

P0-008E can safely create identifiable QA rows in existing staging legacy tables:

- `arrear_tasks`: due today, overdue, short pay, partial repayment, full repayment, adjustment credit, adjustment debit.
- `transactions`: voided rent payment impact and deposit exclusion.

All rows use:

- `qa_run_id=P0-008E-20260525-STAGING-SHADOW-001`
- `source=P0-008E_RECEIVABLES_SHADOW_REHEARSAL`
- IDs prefixed with `p0_008e_`
- isolated `corpid=p0-008e-shadow`

## Data Not Automatically Created

- Production data.
- Production receivables tables.
- Production dashboard rows.
- Real customer/tenant receivables.
- Receivables schema migration rows.
- Cleanup deletes.

## Minimum Safe Scope

1. Confirm target D1 is `homelink-finance-staging`.
2. Confirm production URL exclusion and `gate:commercial-launch=PRODUCTION_NO_GO`.
3. Run seed script in dry-run mode first.
4. Run seed script with `--confirm-staging-receivables-write` only for staging QA rows.
5. Re-run receivables shadow comparison.
6. Keep dashboard live result unchanged.
7. Keep production cutover `NO-GO`.

## Staging D1 Write

This task needs a controlled staging D1 write to seed the missing QA lifecycle evidence. The write is limited to `homelink-finance-staging`, existing staging legacy tables, and rows prefixed with `p0_008e_`.

## Rollback / Cleanup

Rollback for feature flags remains:

```text
ENABLE_RECEIVABLES_SHADOW_STAGING=false
```

No remote receivables shadow feature flag is enabled in this task. Test data cleanup is documented separately and must not run automatically in this task.

## Dashboard Safety

The comparison remains shadow-only. It reads staging D1 data and writes Markdown evidence; it does not call, mutate, or switch dashboard live responses.

## Production NO-GO

Production remains `NO-GO` because P0-008 is still Partial, P0-006 tenant/property scope is incomplete, accounting review is still required, and production migration/deploy/rollback/backfill are not approved.
