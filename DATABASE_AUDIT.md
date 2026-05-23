# Database Audit

Date: 2026-05-23  
Source: `deploy-worker/src/index.js`, `migrations/001_employee_anchor_schema.sql`, local D1 read-only query  
Production migration: not executed  
Production data mutation: not executed

## Local D1 Observation

Read-only local command showed only:

- `_cf_METADATA`
- `active_sessions`
- `employee_users`

This means a clean local database does not yet prove full commercial bootstrap for `sessions`, `transactions`, `arrears`, `arrear_tasks`, `deposit_ledger`, `entry_events`, `audit_logs`, and `app_settings`.

## Tables Detected In Source

| Table             | Purpose                  | Current Risk                                                             |
| ----------------- | ------------------------ | ------------------------------------------------------------------------ |
| `active_sessions` | login/session revocation | lacks tenant/property hierarchy                                          |
| `employee_users`  | employee PIN accounts    | lacks `corpid`, so unsafe for future multi-tenant SaaS                   |
| `sessions`        | handover/session header  | money totals stored as `REAL`; delete path hard-deletes                  |
| `transactions`    | business payment rows    | assumed/altered but not cleanly created in migration; many `REAL` fields |
| `arrears`         | legacy arrears           | legacy table used by owner and compatibility paths                       |
| `arrear_tasks`    | staff follow-up tasks    | money as `REAL`; no formal receivable FK                                 |
| `deposit_ledger`  | deposit movements        | money as `REAL`; hard-delete path exists                                 |
| `entry_events`    | field/event audit        | useful but not complete global audit model                               |
| `audit_logs`      | action audit             | action-level, not always before/after                                    |
| `app_settings`    | JSON settings store      | too broad for rent, WiFi, customers at SaaS scale                        |

## Relationship Map

```text
sessions 1 -> many transactions
transactions 1 -> optional arrear_tasks
transactions 1 -> optional deposit_ledger movement
transactions 1 -> many entry_events
arrear_tasks 1 -> many entry_events
app_settings stores rent_config / wifi_accounts / customers as JSON by corpid + key
audit_logs records selected actions by corpid + userid
```

## Required Commercial Fields

Every business table should be reviewed for:

- `tenant_id` or `company_id`
- `property_id`
- `created_at`
- `updated_at`
- `deleted_at` or `voided_at`
- `created_by`
- `updated_by`
- `deleted_by` or `voided_by`
- immutable audit event link

Current source does not consistently provide these fields across all business tables.

## P0 Database Risks

- Money fields use `REAL` in `sessions`, `transactions`, `arrear_tasks`, `deposit_ledger`, and migration SQL.
- Hard deletes exist for `deposit_ledger`, `transactions`, `arrears`, and `sessions`.
- Clean migration chain is incomplete; `transactions` is altered but not clearly created for a new D1.
- Runtime `CREATE TABLE` / `ALTER TABLE` appears in Worker request paths.
- `employee_users` is not tenant-scoped.
- No formal `receivables` table exists, so arrears are derived from payment rows/tasks instead of a proper receivable lifecycle.

## P1 Database Risks

- `app_settings` JSON blobs store business-critical config such as rent reference and WiFi data.
- `audit_logs` and `entry_events` are split and not a unified immutable audit event model.
- No explicit foreign keys or documented logical constraints.
- No staging/production migration procedure is documented.
- Existing migration file contains encoding corruption in Chinese default text.

## Recommended Migration Order

Do not run these automatically against production.

1. Create migration table and version tracking.
2. Create `companies` / `tenants`.
3. Create `properties`.
4. Create `users` and employee membership scoped by company/property.
5. Create `beds` / `rooms`.
6. Create versioned `bed_rent_config`.
7. Create `sessions` with soft-delete/void fields.
8. Create `transactions` with integer `*_fils` fields.
9. Create `receivables`.
10. Create `arrear_tasks` linked to receivables.
11. Create `deposit_ledger` with integer `*_fils` fields.
12. Create unified `audit_events`.
13. Backfill legacy data with a dry-run reconciliation report.
14. Only after reconciliation, switch read paths to new schema.

## Static Scan Findings

Generated scan found:

- 25 database findings
- 8 explicit `CREATE TABLE` table names in current source scan
- multiple `REAL` uses
- hard delete statements in commercial financial paths

The generated script remains available:

```bash
npm run audit:db
```
