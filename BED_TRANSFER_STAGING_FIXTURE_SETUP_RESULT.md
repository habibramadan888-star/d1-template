# Bed Transfer Staging Fixture Setup Result

Date: 2026-06-01
Status: `PASS`

The E2E used a low-risk staging fixture from existing non-production staging data and a generated empty target bed.

| Fixture | Value |
|---|---|
| from_bed | `STG-valid` |
| to_bed | `STG-transfer-to-20260601185154` |
| customer | `Staging QA Tenant` |
| customer_code | `STG-CID-1779711007144-1e4a78-valid` |
| deposit | `0 fils` read from staging fixture context |
| rent period | `2026-06-01` to `2026-06-02` |
| arrears | `0 fils`, no open staging arrears found for fixture |
| old TTLock ref | `STG-CID-1779711007144-1e4a78-valid` |
| new TTLock ref | `review_required` |
| rollback tag | `qa_bed_transfer_e2e_20260601185154` |
| transfer_id | `bt-20260601185154` |
| audit_id | `audit-bt-20260601185154` |

The fixture did not modify existing occupancy, deposit, arrears, TTLock, financial formula, or dashboard calculation rows.

Production write: no
Production cutover: `PRODUCTION_NO_GO`
