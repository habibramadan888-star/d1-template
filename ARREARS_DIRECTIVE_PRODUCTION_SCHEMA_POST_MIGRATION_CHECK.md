# Arrears Directive Production Schema Post Migration Check

Date: 2026-05-31

## Read-Only Verification

Post-migration checks were read-only:

- `PRAGMA table_info(request_idempotency_keys)`
- `PRAGMA index_list(request_idempotency_keys)`
- `SELECT COUNT(*) FROM request_idempotency_keys`
- `SELECT name FROM pragma_table_info('arrear_tasks') WHERE name IN ('source_type','source_ref')`
- `wrangler secret list` to confirm write gate secret names were absent

## Verification Matrix

| Check                                             | Result             |
| ------------------------------------------------- | ------------------ |
| `request_idempotency_keys` table exists           | yes                |
| `id` exists                                       | yes                |
| `scope` exists                                    | yes                |
| `idempotency_key` exists                          | yes                |
| `actor_user_id` exists                            | yes                |
| `actor_role` exists                               | yes                |
| `action` exists                                   | yes                |
| `request_hash` exists                             | yes                |
| `response_hash` exists                            | yes                |
| `response_body` exists                            | yes                |
| `resource_type` exists                            | yes                |
| `resource_id` exists                              | yes                |
| `status` exists                                   | yes                |
| `created_at` exists                               | yes                |
| `expires_at` exists                               | yes                |
| `idx_request_idempotency_scope_action_key` exists | yes                |
| unique index on scope/action/key                  | yes                |
| `idx_request_idempotency_actor_action` exists     | yes                |
| `idx_request_idempotency_resource` exists         | yes                |
| `idx_request_idempotency_expires_at` exists       | yes                |
| `request_idempotency_keys` business row count     | 0                  |
| `source_type` added by this task                  | no                 |
| `source_ref` added by this task                   | no                 |
| production write gate secret present              | no                 |
| production write gate enabled                     | no                 |
| production cutover                                | `PRODUCTION_NO_GO` |

## Conclusion

`SCHEMA_READY_FOR_EXISTING_ARREARS_WRITE_SMOKE`

This only means the idempotency schema prerequisite is now present for a separately approved `existing_arrears_record` production write smoke. It does not approve or execute the write smoke.

TTLock persisted row smoke still requires a separate `source_type` / `source_ref` decision if those rows must be stored in `arrear_tasks`.
