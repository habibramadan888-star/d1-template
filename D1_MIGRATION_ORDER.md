# D1 Migration Order

Date: 2026-05-24  
Task: P0-005 Clean D1 Bootstrap

## Current Order

| Order               | File                                                  | Purpose                                                                          | Tables Affected                                                                                                                                            | Safe For Local         | Safe For Production | Needs Human Approval                |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------- | ----------------------------------- |
| Legacy manual patch | `migrations/001_employee_anchor_schema.sql`           | Historical patch for an already-existing D1 where `transactions` already exists. | `transactions`, `arrear_tasks`, `entry_events`                                                                                                             | No for clean bootstrap | No                  | Yes                                 |
| 001                 | `migrations/local/001_clean_legacy_bootstrap.sql`     | Create minimum legacy-compatible schema for clean local D1.                      | `active_sessions`, `employee_users`, `audit_logs`, `app_settings`, `sessions`, `transactions`, `arrears`, `arrear_tasks`, `entry_events`, `deposit_ledger` | Yes                    | No                  | Yes before any production promotion |
| Draft 002           | `migration-drafts/002_commercial_bootstrap.sql`       | Future SaaS schema with integer-fils money, tenancy, receivables, and payments.  | `companies`, `properties`, `users`, `transactions`, `receivables`, `payments`, `audit_events`, etc.                                                        | Rehearsal only         | No                  | Yes                                 |
| Draft 003           | `migration-drafts/003_delete_session_void_fields.sql` | P0-004 production rollout draft for void fields on existing legacy tables.       | `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks`                                                                                    | Rehearsal only         | No                  | Yes                                 |

## Execution Rules

- `npm run db:local:bootstrap` runs only `migrations/local/*.sql` against local D1.
- `npm run verify:clean-d1` uses a disposable temp D1 path and removes it after verification.
- No script uses `--remote`.
- No script runs `wrangler d1 migrations apply`.
- Production promotion must be a separate reviewed task with backup, rollback plan, and customer data review.

## Why Draft 002 Is Not Applied In P0-005

Draft 002 changes the accounting model to integer fils, formal receivables, tenancy, and payments. Applying it to the live Worker would mix P0-001, P0-006, and P0-008 into P0-005. The safe P0-005 move is to create the minimum current-schema bootstrap first.
