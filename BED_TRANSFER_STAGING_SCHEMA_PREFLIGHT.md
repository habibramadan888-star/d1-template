# Bed Transfer Staging Schema Preflight

Date: 2026-06-01
Environment: staging D1 only
Database: `homelink-finance-staging`
Result: `PASS`

Only staging D1 schema checks were executed. No production command was executed.

## Schema Support

| Requirement | Staging Current | Result |
|---|---|---|
| `bed_transfer_events` exists | table exists | PASS |
| `from_bed` supported | column exists | PASS |
| `to_bed` supported | column exists | PASS |
| `transfer_date` supported | column exists | PASS |
| deposit carry-over supported | `original_deposit_amount_fils` exists | PASS |
| arrears carry-over supported | `carry_over_arrears_fils` exists | PASS |
| TTLock old/new refs supported | `old_ttlock_ref`, `new_ttlock_ref` exist | PASS |
| audit linkage supported | `audit_id` exists | PASS |
| trace linkage supported | `trace_id` exists | PASS |
| status supported | `status` exists with lifecycle check | PASS |
| qa_tag supported | `qa_tag` exists | PASS |
| required indexes | from/to/customer/date/status/qa_tag indexes exist | PASS |

## Decision

Staging schema now supports the Bed Transfer event closure contract sufficiently for a staging-only E2E.

Production write: no
Production migration: no
Production cutover: `PRODUCTION_NO_GO`
