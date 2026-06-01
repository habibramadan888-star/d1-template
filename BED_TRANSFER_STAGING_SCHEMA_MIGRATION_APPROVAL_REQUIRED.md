# Bed Transfer Staging Schema Migration Approval Required

Date: 2026-06-01
Environment: staging only
Status: `APPROVAL_REQUIRED_BEFORE_E2E`

The staging schema does not currently support the full Bed Transfer event contract. A staging-only migration must be reviewed and approved before the E2E can create a real fixture or save a transfer event.

## Missing Support

| Missing Capability | Required Before E2E |
|---|---|
| Dedicated event table | `bed_transfer_events` or equivalent table |
| Transfer lifecycle | `status`, `created_at`, `operator_employee`, `reason` |
| Bed anchors | `from_bed`, `to_bed`, `transfer_date`, `effective_date` |
| Customer anchors | `customer_id`, `tenant_id` or `customer_code`, display name |
| Original occupancy anchors | `original_checkin_date`, original rent period start/end |
| Deposit carry-over | `original_deposit_amount_fils`, deposit carried flag/reference |
| Arrears carry-over | `carry_over_arrears_fils`, arrears reference |
| TTLock trace | `old_ttlock_ref`, `new_ttlock_ref`, old/new valid windows |
| Audit/trace linkage | `audit_id`, trace/timeline linkage |

## Minimum Staging Migration Shape

This is a review target, not an executed migration:

```sql
CREATE TABLE IF NOT EXISTS bed_transfer_events (
  transfer_id TEXT PRIMARY KEY,
  corpid TEXT NOT NULL,
  from_bed TEXT NOT NULL,
  to_bed TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  effective_date TEXT,
  customer_id TEXT,
  tenant_id TEXT,
  customer_code TEXT,
  customer_display_name TEXT,
  original_checkin_date TEXT,
  original_rent_period_start TEXT,
  original_rent_period_end TEXT,
  original_deposit_amount_fils INTEGER,
  current_rent_amount_fils INTEGER,
  new_bed_rent_amount_fils INTEGER,
  rent_difference_fils INTEGER,
  transfer_fee_fils INTEGER DEFAULT 0,
  carry_over_arrears_fils INTEGER DEFAULT 0,
  old_ttlock_ref TEXT,
  new_ttlock_ref TEXT,
  old_lock_valid_from TEXT,
  old_lock_valid_until TEXT,
  new_lock_valid_from TEXT,
  new_lock_valid_until TEXT,
  reason TEXT,
  operator_employee TEXT,
  audit_id TEXT,
  status TEXT DEFAULT 'pending_review',
  qa_tag TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);
```

## Approval Boundary

- Staging migration may be considered in a separate approval step.
- No production migration is approved by this document.
- No production D1 write/export/import/execute is approved.
- No production deploy is approved.
- Production cutover remains `PRODUCTION_NO_GO`.
