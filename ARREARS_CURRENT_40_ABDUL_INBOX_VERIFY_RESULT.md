# Arrears Current 40 Abdul Inbox Verify Result

Date: 2026-06-01

Result: `SKIPPED_BLOCKED`

Abdul inbox verification for the full current SOT dispatch was not executed because no production dispatch occurred.

| Expected | Actual | Result |
|---|---|---|
| production dispatch completed first | no | BLOCKED |
| Abdul inbox count after dispatch | not queried for new dispatch | SKIPPED |
| existing_arrears rows included | not applicable | SKIPPED |
| TTLock rows included | not applicable | SKIPPED |
| 112 / 113 / 125 included if in SOT | not applicable | SKIPPED |
| internal IDs hidden | not applicable | SKIPPED |
| raw source_type hidden | not applicable | SKIPPED |
| debug fields hidden | not applicable | SKIPPED |
| production D1 write | no | PASS |
| production cutover | PRODUCTION_NO_GO | PASS |
