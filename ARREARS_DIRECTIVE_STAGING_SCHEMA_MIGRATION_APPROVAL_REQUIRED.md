# Arrears Directive Staging Schema Migration Approval Required

Date: 2026-05-31

Result: `MIGRATION_APPROVAL_REQUIRED_BEFORE_STAGING_WRITE_QA`

Staging write QA was approved for at most two test arrears directive tasks, but schema preflight found no durable idempotency key storage for the new directive write APIs.

## Why Migration Approval Is Required

The real closure QA must prove:

- Duplicate owner directive requests with the same `idempotency_key` do not create duplicate work.
- Duplicate employee follow-up requests with the same `idempotency_key` do not create duplicate writes.
- The operation is traceable through audit/event records.

The current staging schema requires an idempotency key in API payloads but does not persist it in a dedicated table/field. Without migration, duplicate-key behavior cannot be proven safely.

## Suggested Staging-Only Schema Direction

Do not apply this automatically. It requires a separate migration approval.

| Proposed Object | Purpose |
|---|---|
| `arrears_directive_idempotency_keys` | Store `corpid`, `operation`, `idempotency_key`, `task_ids`, response summary, created timestamp. |
| Unique index on `(corpid, operation, idempotency_key)` | Enforce replay-safe duplicate prevention. |
| Optional operation metadata | Record owner create vs employee follow-up scope. |

## Current Run Outcome

| Item | Result |
|---|---|
| Staging Worker deploy | done, staging only |
| Staging write gate | temporarily enabled, then disabled |
| Schema preflight | failed due missing durable idempotency storage |
| Business write executed | no |
| Production D1 write | no |
| Migration executed | no |
| Production cutover | `PRODUCTION_NO_GO` |
