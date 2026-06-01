# Bed Transfer Staging Schema Migration Result

Date: 2026-06-01
Environment: staging
Database: `homelink-finance-staging`
Migration: `migrations/005_bed_transfer_events.sql`

| Item | Result |
|---|---|
| Environment | staging |
| Migration applied | yes |
| Production touched | no |
| bed_transfer_events exists | yes |
| indexes exist | yes |
| rollback available | yes |

## Execution Evidence

The migration was applied with:

```text
npx wrangler d1 execute homelink-finance-staging --remote --env staging --config wrangler.toml --file ../migrations/005_bed_transfer_events.sql
```

Wrangler reported:

```text
Processed 8 queries.
Executed 8 queries in 4.79ms.
Rows written: 11.
```

## Post-Migration Check

`PRAGMA table_info(bed_transfer_events)` returned the expected event fields including:

- `from_bed`
- `to_bed`
- `transfer_date`
- `customer_id`
- `customer_code`
- `original_deposit_amount_fils`
- `carry_over_arrears_fils`
- `old_ttlock_ref`
- `new_ttlock_ref`
- `status`
- `audit_id`
- `trace_id`
- `qa_tag`

Index check returned indexes on:

- `from_bed`
- `to_bed`
- `customer_id`
- `customer_code`
- `transfer_date`
- `qa_tag`
- `status`

Production write: no
Production migration: no
Production deploy: no
Production cutover: `PRODUCTION_NO_GO`
