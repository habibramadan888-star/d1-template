# Bed Transfer Staging Save Result

Date: 2026-06-01
Status: `PASS`

One staging-only QA event was saved and then rolled back.

| Save Check | Expected | Actual | Result |
|---|---|---|---|
| create bed_transfer_event | one QA-tagged event | `bt-20260601185154` created | PASS |
| from_bed to to_bed relation | persisted | `STG-valid` to `STG-transfer-to-20260601185154` | PASS |
| tenant/customer anchor | preserved | `STG-CID-1779711007144-1e4a78-valid` | PASS |
| deposit responsibility transfer | liability carried, no revenue | `original_deposit_amount_fils=0`, no revenue row created | PASS |
| rent period transfer | carried | `2026-06-01` to `2026-06-02` | PASS |
| arrears carry-over | preserved, not cleared | `carry_over_arrears_fils=0`, no arrears update | PASS |
| old TTLock ref | preserved | `STG-CID-1779711007144-1e4a78-valid` | PASS |
| new TTLock ref | created or review required | `review_required` | PASS |
| audit write | linked | `audit-bt-20260601185154` | PASS |
| new tenant count | unchanged | no occupancy/new tenant table update | PASS |
| checkout count | unchanged | no checkout table update | PASS |
| financial formula | unchanged | no formula/code touched | PASS |
| dashboard calculation | unchanged | no dashboard/code touched | PASS |

The event and audit rows were deleted during rollback.

Production write: no
Production cutover: `PRODUCTION_NO_GO`
