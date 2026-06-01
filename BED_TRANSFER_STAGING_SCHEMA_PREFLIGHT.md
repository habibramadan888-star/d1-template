# Bed Transfer Staging Schema Preflight

Date: 2026-06-01
Environment: staging D1 only
Database: `homelink-finance-staging`
Result: `BLOCKED_SCHEMA_UNSUPPORTED`

Only read-only staging schema commands were executed:

- `SELECT name, sql FROM sqlite_master ...`
- `PRAGMA table_info(transactions)`
- `PRAGMA table_info(bed_transfer_events)`
- `PRAGMA table_info(audit_logs)`

No production command, production write, production migration, deploy, export, or import was executed.

## Required Schema Support

| Requirement | Staging Current | Result |
|---|---|---|
| `bed_transfer_events` or equivalent event table | missing, `PRAGMA table_info(bed_transfer_events)` returned `[]` | FAIL |
| `from_bed` | `transactions.bed_from` exists | PARTIAL |
| `to_bed` | `transactions.bed_to` exists | PARTIAL |
| `transfer_date` | missing from `transactions`; no event table | FAIL |
| `customer_id / tenant_id / customer_code` | no dedicated bed-transfer event anchor | FAIL |
| `original_checkin_date` | missing | FAIL |
| `original_rent_period_start` | only legacy `transactions.original_period_start` exists | PARTIAL |
| `original_rent_period_end` | only legacy `transactions.original_period_end` exists | PARTIAL |
| `original_deposit_amount_fils` | missing | FAIL |
| `carry_over_arrears_fils` | missing | FAIL |
| `old_ttlock_ref` | missing | FAIL |
| `new_ttlock_ref` | missing | FAIL |
| `reason` | generic `transactions.reason` exists, not event contract specific | PARTIAL |
| `status` | generic `transactions.status` exists, not event lifecycle specific | PARTIAL |
| audit linkage | `audit_logs` exists but no `audit_id` event linkage | FAIL |
| traceability linkage | missing dedicated trace/event linkage | FAIL |

## Existing Relevant Tables

| Table | Finding |
|---|---|
| `transactions` | legacy table includes `bed_from`, `bed_to`, `fee_paid`, `fee_waiver_reason`; does not contain the complete event contract fields. |
| `audit_logs` | generic audit table exists with `action`, `target`, `detail`; does not provide required bed-transfer event linkage by itself. |
| `arrear_tasks` | arrears table exists; not a bed-transfer event table. |
| `bed_transfer_events` | missing. |

## Decision

Staging cannot safely execute the requested bed-transfer E2E because the schema cannot persist the closure contract:

- deposit carry-over evidence
- arrears carry-over evidence
- TTLock old/new refs
- original check-in/rent period anchors
- dedicated event lifecycle status
- audit/trace linkage

Per task instruction, the staging write path is stopped and `BED_TRANSFER_STAGING_SCHEMA_MIGRATION_APPROVAL_REQUIRED.md` is generated.

Production cutover remains `PRODUCTION_NO_GO`.
