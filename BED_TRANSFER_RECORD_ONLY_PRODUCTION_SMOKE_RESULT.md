# Bed Transfer Record-Only Production Smoke Result

Date: 2026-06-01

## Result

`PASS`

## Smoke Scope

One production Bed Transfer record-only event was created through the live employee API.

| Field | Value |
|---|---|
| from_bed | `103` |
| to_bed | `947` |
| transfer_id | `bt-20260601-103-947-223d33b8` |
| qa_tag | `qa-prod-bed-transfer-record-only-20260601170657` |
| status | `recorded` |

## Checks

| Check | Result |
|---|---|
| Employee auth usable | PASS |
| Owner auth usable | PASS |
| Create response | PASS, HTTP 201 |
| Saved status | `recorded` |
| Idempotency replay | PASS, same transfer and no duplicate event row |
| Owner visibility | PASS |
| Event row count | 1 |
| Trace row count | 1 |
| Audit row count | 1 |
| Idempotency row count | 1 |
| Transactions snapshot unchanged | PASS |
| Arrears snapshot unchanged | PASS |
| Deposit ledger snapshot unchanged | PASS |
| Password/token/cookie printed | No |

## Safety

This smoke wrote only event-ledger/audit/trace/idempotency evidence. It did not mutate occupancy, deposits, arrears, TTLock, financial formulas, or dashboard calculations.

Production cutover remains `PRODUCTION_NO_GO`.
