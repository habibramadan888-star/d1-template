# Bed Transfer Employee Save Path Staging E2E Result

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

## Environment

| Item | Result |
|---|---|
| Staging Worker | `homelink-finance-staging` |
| Staging URL | `https://homelink-finance-staging.habibramadan888.workers.dev` |
| Staging deploy needed before E2E | yes |
| Staging Worker version | `0b8e25ec-c30a-4347-be99-04d16421beb3` |
| Production write | no |
| Production cutover | `PRODUCTION_NO_GO` |

## E2E Inputs

| Field | Value |
|---|---|
| from_bed | `STG-valid` |
| to_bed | `STG-transfer-api-20260601163044` |
| transfer_date | `2026-06-01` |
| reason | `Management adjustment` |
| note | `Staging E2E: employee UI save path to pending review only.` |
| qa_tag | `qa_bed_transfer_api_20260601163044` |

## Results

| Check | Expected | Actual | Result |
|---|---|---|---|
| employee API create | HTTP 201 | HTTP 201 | PASS |
| standard response code | `0` | `0` | PASS |
| event status | `pending_review` | `pending_review` | PASS |
| owner API visibility | visible | visible | PASS |
| idempotency replay | no duplicate event | same transfer response returned | PASS |
| bed_transfer_events row | 1 | 1 before cleanup | PASS |
| audit_logs row | 1 | 1 before cleanup | PASS |
| entry_events trace row | 1 | 1 before cleanup | PASS |
| request_idempotency_keys row | 1 | 1 before cleanup | PASS |
| occupancy mutation | none | no transaction QA mutation rows | PASS |
| rollback cleanup | QA rows removed | 0 rows after cleanup | PASS |

## Cleanup

Staging cleanup removed the QA `bed_transfer_events`, `audit_logs`, `entry_events`, and `request_idempotency_keys` rows for the staging smoke transfer.

Production remained untouched during staging E2E.
