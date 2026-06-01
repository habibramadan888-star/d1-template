# Bed Transfer Staging Save Result

Date: 2026-06-01
Status: `NOT_EXECUTED_SCHEMA_BLOCKED`

No staging bed-transfer save was executed.

| Save Check | Expected | Actual | Result |
|---|---|---|---|
| create bed_transfer_event | one QA-tagged event | not executed | BLOCKED |
| from_bed to to_bed relation | persisted | not executed | BLOCKED |
| tenant/customer anchor | preserved | not executed | BLOCKED |
| deposit responsibility transfer | liability carried, no revenue | not executed | BLOCKED |
| rent period transfer | carried | not executed | BLOCKED |
| arrears carry-over | preserved, not cleared | not executed | BLOCKED |
| old TTLock ref | preserved | not executed | BLOCKED |
| new TTLock ref | created or review required | not executed | BLOCKED |
| audit write | linked | not executed | BLOCKED |
| new tenant count | unchanged | not executed | BLOCKED |
| checkout count | unchanged | not executed | BLOCKED |
| financial formula | unchanged | unchanged | PASS |
| dashboard calculation | unchanged | unchanged | PASS |

The save path is blocked until staging schema migration is approved.
