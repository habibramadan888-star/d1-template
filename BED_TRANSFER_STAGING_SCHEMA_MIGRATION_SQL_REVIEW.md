# Bed Transfer Staging Schema Migration SQL Review

Date: 2026-06-01
Migration: `migrations/005_bed_transfer_events.sql`
Scope: staging-only unless separately approved for production

## Review Result

| Requirement | Result |
|---|---|
| Creates `bed_transfer_events` | yes |
| Supports `id / transfer_id` | yes |
| Supports `corp_id / tenant_scope` | yes |
| Supports `from_bed` and `to_bed` | yes |
| Supports `transfer_date` and `effective_date` | yes |
| Supports customer anchors | yes, `customer_id`, `customer_code`, `customer_display_name` |
| Supports original occupancy/rent anchors | yes |
| Supports deposit carry-over | yes, `original_deposit_amount_fils` |
| Supports rent amount and difference | yes |
| Supports transfer fee as explicit-only | yes, `transfer_fee_fils` |
| Supports arrears carry-over | yes, `carry_over_arrears_fils` |
| Supports TTLock trace | yes, old/new refs and valid windows |
| Supports reason/note/operator | yes |
| Supports status lifecycle | yes |
| Supports audit/trace linkage | yes, `audit_id`, `trace_id` |
| Supports QA rollback anchor | yes, `qa_tag` |
| Idempotent | yes, `IF NOT EXISTS` table and indexes |
| Modifies existing finance tables | no |
| Deletes existing rows/tables | no |
| Changes financial formula | no |
| Changes dashboard calculation | no |

## Indexes

| Index | Field |
|---|---|
| `idx_bed_transfer_events_from_bed` | `from_bed` |
| `idx_bed_transfer_events_to_bed` | `to_bed` |
| `idx_bed_transfer_events_customer_id` | `customer_id` |
| `idx_bed_transfer_events_customer_code` | `customer_code` |
| `idx_bed_transfer_events_transfer_date` | `transfer_date` |
| `idx_bed_transfer_events_qa_tag` | `qa_tag` |
| `idx_bed_transfer_events_status` | `status` |

## Rollback SQL

Rollback requires separate approval because it drops the event table. For staging-only rollback before production hardening:

```sql
DROP INDEX IF EXISTS idx_bed_transfer_events_from_bed;
DROP INDEX IF EXISTS idx_bed_transfer_events_to_bed;
DROP INDEX IF EXISTS idx_bed_transfer_events_customer_id;
DROP INDEX IF EXISTS idx_bed_transfer_events_customer_code;
DROP INDEX IF EXISTS idx_bed_transfer_events_transfer_date;
DROP INDEX IF EXISTS idx_bed_transfer_events_qa_tag;
DROP INDEX IF EXISTS idx_bed_transfer_events_status;
DROP TABLE IF EXISTS bed_transfer_events;
```

This rollback SQL was not executed in this task. Production rollback is not approved by this document.

Production cutover remains `PRODUCTION_NO_GO`.
