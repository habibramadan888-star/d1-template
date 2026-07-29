# Staging D1 Current Schema Snapshot

Generated: 2026-05-25

Target check:

| Field   | Expected                               | Confirmed                              |
| ------- | -------------------------------------- | -------------------------------------- |
| D1 name | `homelink-finance-staging`             | `homelink-finance-staging`             |
| D1 id   | `4ff78bfc-3855-436b-aefb-6b492145d79c` | `4ff78bfc-3855-436b-aefb-6b492145d79c` |

Read-only command executed:

```powershell
npx wrangler d1 execute homelink-finance-staging --remote --command "SELECT name, type, sql FROM sqlite_schema WHERE type IN ('table','index','view') ORDER BY type, name;"
```

Safety evidence from Wrangler result:

| Check              | Result      |
| ------------------ | ----------- |
| SQL statement      | SELECT only |
| `changes`          | `0`         |
| `changed_db`       | `false`     |
| `rows_written`     | `0`         |
| Migration executed | No          |
| D1 write executed  | No          |

## Schema Objects

| Type  | Name     | SQL                                                                      | Notes                                        |
| ----- | -------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| table | `_cf_KV` | `CREATE TABLE _cf_KV ( key TEXT PRIMARY KEY, value BLOB ) WITHOUT ROWID` | Cloudflare internal table. Not an app table. |

## Direct Answers

| Question                                                             | Answer                                                                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Is staging D1 empty?                                                 | Empty of application schema. It contains only Cloudflare internal `_cf_KV`.                  |
| Existing system tables?                                              | Yes, `_cf_KV` internal table.                                                                |
| Existing migration tracking table?                                   | No app migration table found.                                                                |
| Existing `sessions` / `transactions` / `deposit_ledger` / `arrears`? | No.                                                                                          |
| Existing `employee_users`?                                           | No.                                                                                          |
| Existing `audit_logs` / `entry_events`?                              | No.                                                                                          |
| Existing handover staging tables?                                    | No.                                                                                          |
| Any table that looks like production business data?                  | No application/business tables found.                                                        |
| Safe to enter bootstrap plan?                                        | Yes for planning. Actual schema write requires backup and human approval in a separate task. |

Conclusion: staging D1 requires schema bootstrap before real staging write QA.
