# Bed Transfer Staging Validation Result

Date: 2026-06-01
Status: `NOT_EXECUTED_SCHEMA_BLOCKED`

The employee Bed Transfer validation flow was not executed against staging data because the staging schema cannot persist the required event contract.

| Validation | Expected | Actual | Result |
|---|---|---|---|
| from_bed not empty | validate | not executed | BLOCKED |
| to_bed not empty | validate | not executed | BLOCKED |
| from_bed != to_bed | validate | not executed | BLOCKED |
| from_bed has active tenant | validate | not executed | BLOCKED |
| to_bed available | validate | not executed | BLOCKED |
| deposit readable | validate | not executed | BLOCKED |
| rent period readable | validate | not executed | BLOCKED |
| arrears readable | validate | not executed | BLOCKED |
| old TTLock ref readable | validate | not executed | BLOCKED |
| rent difference review flag | validate if applicable | not executed | BLOCKED |
| validation summary | generated | not executed | BLOCKED |

Local static validation tests remain covered by `npm run test:bed-transfer-validation-service`.
