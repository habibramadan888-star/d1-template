# Bed Transfer Production Schema Migration Result

Date: 2026-06-01 Asia/Dubai

Migration: `migrations/005_bed_transfer_events.sql`

## Result

| Item | Result |
|---|---|
| Production schema migration executed | YES |
| Database | `homelink` remote D1 |
| Rows written by migration metadata/index creation | 11 |
| `bed_transfer_events` table after migration | PRESENT |
| Expected indexes after migration | PRESENT |
| D1 export/import | NO |
| Business data write | NO |
| Production cutover | PRODUCTION_NO_GO |

## Created Table

`bed_transfer_events` now exists with the approved event closure columns:

- `from_bed`
- `to_bed`
- `transfer_date`
- `customer_code`
- `original_deposit_amount_fils`
- `current_rent_amount_fils`
- `new_bed_rent_amount_fils`
- `carry_over_arrears_fils`
- `old_ttlock_ref`
- `new_ttlock_ref`
- `status`
- `audit_id`
- `trace_id`
- `qa_tag`

Indexes verified:

- `idx_bed_transfer_events_from_bed`
- `idx_bed_transfer_events_to_bed`
- `idx_bed_transfer_events_customer_id`
- `idx_bed_transfer_events_customer_code`
- `idx_bed_transfer_events_transfer_date`
- `idx_bed_transfer_events_qa_tag`
- `idx_bed_transfer_events_status`
