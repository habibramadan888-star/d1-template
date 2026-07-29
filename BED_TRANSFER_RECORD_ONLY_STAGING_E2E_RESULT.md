# Bed Transfer Record-Only Staging E2E Result

Date: 2026-06-01

## Result

`PASS`

## Environment

| Item | Value |
|---|---|
| Worker | `homelink-finance-staging` |
| URL | `https://homelink-finance-staging.habibramadan888.workers.dev` |
| Worker version | `55c42765-39d3-4e40-9dbd-038642f685a3` |
| Migration | `migrations/006_bed_transfer_recorded_status.sql` |
| Migration result | PASS, 12 queries processed |

## E2E Checks

| Check | Result |
|---|---|
| Employee login | PASS |
| Owner login | PASS |
| Employee `POST /api/employee/bed-transfers` | PASS, HTTP 201 |
| Saved status | `recorded` |
| Idempotency replay | PASS, same transfer and no duplicate event row |
| Owner `GET /api/owner/bed-transfers?status=recorded` visibility | PASS |
| Event row count | 1 |
| Trace row count | 1 |
| Audit row count | 1 |
| Idempotency row count | 1 |
| QA cleanup | PASS, all QA rows removed |
| Secrets printed | No |

## Evidence

| Field | Value |
|---|---|
| transfer_id | `bt-20260601-STG-FROM-170406-STG-TO-170406-b423aa98` |
| qa_tag | `QA_BED_TRANSFER_RECORD_ONLY_20260601170406` |
| cleanup_result | PASS |

Production cutover remains `PRODUCTION_NO_GO`.
