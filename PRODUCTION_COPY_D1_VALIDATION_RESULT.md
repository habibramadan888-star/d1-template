# Production Copy D1 Validation Result

Date: 2026-05-27, Asia/Dubai

Scope: read-only validation of `homelink-finance-production-copy-dryrun`.
Validation queried schema metadata and aggregate row counts only. No business
row contents were read into this report.

## Copy D1

| Item        | Value                                   | Result |
| ----------- | --------------------------------------- | ------ |
| D1 name     | homelink-finance-production-copy-dryrun | PASS   |
| D1 id       | c461c7f1-47bc-40cf-bbfd-1c03101943bd    | PASS   |
| Table count | 19                                      | PASS   |
| Size        | 393 kB                                  | PASS   |

## Key Table Row Counts

| Table           | Row Count | Notes                              |
| --------------- | --------: | ---------------------------------- |
| sessions        |        25 | Present in production copy.        |
| transactions    |       232 | Present in production copy.        |
| deposit_ledger  |         0 | Present, empty in production copy. |
| arrears         |         6 | Present in production copy.        |
| employee_users  |         1 | Present in production copy.        |
| audit_logs      |       108 | Present in production copy.        |
| entry_events    |         8 | Present in production copy.        |
| arrear_tasks    |         1 | Present in production copy.        |
| active_sessions |       118 | Present in production copy.        |
| app_settings    |         1 | Present in production copy.        |

## Future Table Presence

| Table                     | Exists | Notes                                              |
| ------------------------- | ------ | -------------------------------------------------- |
| handover_commits          | no     | Future/local-staging table not in production copy. |
| handover_commit_rows      | no     | Future/local-staging table not in production copy. |
| handover_idempotency_keys | no     | Future/local-staging table not in production copy. |
| receivables               | no     | Future receivables table not in production copy.   |
| receivable_events         | no     | Future receivables table not in production copy.   |
| payment_allocations       | no     | Future receivables table not in production copy.   |

## Scope Column Snapshot

| Table          | Current Scope Fields Observed     | Notes                                                         |
| -------------- | --------------------------------- | ------------------------------------------------------------- |
| sessions       | `corpid`                          | No production tenant/property compatibility columns observed. |
| transactions   | `corpid`, `userid`                | Legacy scope only; money columns still include `REAL`.        |
| deposit_ledger | `corpid`, `userid`                | Legacy scope only; table currently empty.                     |
| arrears        | `corpid`, `userid`                | Legacy scope only; amount remains `REAL`.                     |
| arrear_tasks   | `corpid`, `userid`                | Legacy scope only; amount remains `REAL`.                     |
| employee_users | `employee_id`, `role`             | No production tenant/property columns observed.               |
| audit_logs     | `corpid`, `userid`, `role`        | Legacy scope only.                                            |
| entry_events   | `corpid`, `userid`, `operator_id` | Legacy scope only.                                            |

## Validation Notes

- A first attempt to use compound `UNION ALL` and dynamic table-valued PRAGMA
  forms was rejected by D1 with SQLite errors. Those rejected validation queries
  did not write data.
- Follow-up validation used single-row subqueries and per-table
  `PRAGMA table_info(...)` against the copy D1 only.

Conclusion: production-copy D1 contains the expected imported legacy production
schema/data snapshot and is suitable for future copy-only migration/backfill
dry-run preparation. It also confirms why production remains NO-GO: tenant scope
and receivables schema are not live in production.
