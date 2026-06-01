# Bed Transfer Staging Statistics Verify

Date: 2026-06-01
Status: `NOT_EXECUTED_SCHEMA_BLOCKED`

| Statistic Check | Expected | Actual | Result |
|---|---|---|---|
| bed_transfer_count | +1 | not executed | BLOCKED |
| new_tenant_count | unchanged | not executed | BLOCKED |
| checkout_count | unchanged | not executed | BLOCKED |
| occupancy net change | no false increase | not executed | BLOCKED |
| from_bed_transfer_count | +1 | not executed | BLOCKED |
| to_bed_transfer_count | +1 | not executed | BLOCKED |
| customer_transfer_count | +1 | not executed | BLOCKED |
| employee_transfer_count | +1 | not executed | BLOCKED |
| transfer_with_arrears_count | +1 if arrears present | not executed | BLOCKED |
| transfer_with_ttlock_review_count | +1 if TTLock review | not executed | BLOCKED |

Staging statistics verification requires a persisted event record or equivalent trace table.
