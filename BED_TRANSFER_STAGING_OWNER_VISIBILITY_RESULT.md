# Bed Transfer Staging Owner Visibility Result

Date: 2026-06-01
Status: `PASS`

The persisted staging event exposed the fields required for owner/backend read visibility before rollback.

| Owner Visibility Check | Expected | Actual | Result |
|---|---|---|---|
| from_bed to to_bed | visible/readable | `STG-valid` to `STG-transfer-to-20260601185154` | PASS |
| transfer_date | visible/readable | `2026-06-01` | PASS |
| operator employee | visible/readable | `qa-bed-transfer-e2e` | PASS |
| deposit carried | visible/readable | `0 fils` | PASS |
| arrears carried | visible/readable | `0 fils` | PASS |
| TTLock trace status | visible/readable | old ref preserved, new ref `review_required` | PASS |
| rent difference review status | visible/readable | `0 fils` difference | PASS |
| audit id | visible/readable | `audit-bt-20260601185154` | PASS |
| timeline trace | visible/readable | `trace-bt-20260601185154` | PASS |

No production owner endpoint or production data was touched.
