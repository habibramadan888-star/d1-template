# Bed Transfer Staging TTLock Trace Verify

Date: 2026-06-01
Status: `NOT_EXECUTED_SCHEMA_BLOCKED`

| TTLock Trace Check | Expected | Actual | Result |
|---|---|---|---|
| old_ttlock_ref preserved | yes | not executed | BLOCKED |
| old lock/card/passcode history preserved | yes | not executed | BLOCKED |
| original TTLock valid-from preserved | yes | not executed | BLOCKED |
| old_valid_until preserved or closed at transfer_date | yes | not executed | BLOCKED |
| new_ttlock_ref created or review required | yes | not executed | BLOCKED |
| no old TTLock data deleted | yes | not executed | BLOCKED |
| trace shows old bed to new bed | yes | not executed | BLOCKED |

The staging schema has no event fields for `old_ttlock_ref` or `new_ttlock_ref`; this must be resolved before E2E.
