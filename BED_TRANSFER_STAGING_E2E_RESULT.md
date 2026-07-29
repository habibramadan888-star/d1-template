# Bed Transfer Staging E2E Result

Date: 2026-06-01
Environment: staging D1 only
Result: `PASS`

The E2E used a staging-only schema migration, one QA-tagged event, one QA audit row, verification reads, and rollback. The QA event/audit rows were deleted after verification.

| Step | Result |
|---|---|
| staging migration | PASS |
| schema preflight | PASS |
| fixture setup | PASS |
| validation | PASS |
| save | PASS |
| accounting verify | PASS |
| TTLock trace verify | PASS |
| statistics verify | PASS |
| owner visibility | PASS |
| rollback | PASS |

## Fixture

| Field | Value |
|---|---|
| from_bed | `STG-valid` |
| to_bed | `STG-transfer-to-20260601185154` |
| customer | `Staging QA Tenant` |
| customer_code | `STG-CID-1779711007144-1e4a78-valid` |
| transfer_id | `bt-20260601185154` |
| audit_id | `audit-bt-20260601185154` |
| qa_tag | `qa_bed_transfer_e2e_20260601185154` |
| status | `pending_review` |

## Safety

| Check | Result |
|---|---|
| production write | no |
| production migration | no |
| production deploy | no |
| production write gate | off |
| staging rollback | completed |
| financial formula changed | no |
| dashboard calculation changed | no |
| production cutover | `PRODUCTION_NO_GO` |
