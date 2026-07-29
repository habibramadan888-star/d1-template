# D1 Clean Bootstrap Fix Report

Date: 2026-05-24  
Task: P0-005 Clean D1 Bootstrap

## What Changed

- Added local-only migration `migrations/local/001_clean_legacy_bootstrap.sql`.
- Added local D1 scripts:
  - `scripts/db-local-bootstrap-utils.mjs`
  - `scripts/db-local-reset.mjs`
  - `scripts/db-local-migrate.mjs`
  - `scripts/db-local-seed.mjs`
  - `scripts/db-local-bootstrap.mjs`
  - `scripts/verify-clean-d1.mjs`
- Added package scripts:
  - `db:local:reset`
  - `db:local:migrate`
  - `db:local:seed`
  - `db:local:bootstrap`
  - `db:local:verify`
  - `verify:clean-d1`
- Updated `scripts/probe-clean-worker-bootstrap.mjs` to run local migration and dev seed before employee entry smoke.
- Updated `scripts/audit-db.mjs` so nested local migrations are included in static DB scan.

## Tables Added To Local Bootstrap

| Table             | Why Minimum Necessary                              | Future Risk                                   |
| ----------------- | -------------------------------------------------- | --------------------------------------------- |
| `active_sessions` | Login/session persistence.                         | Must remain tenant-scoped in P0-006.          |
| `employee_users`  | Employee PIN login and dev seed.                   | Must become tenant/property-scoped in P0-006. |
| `audit_logs`      | Current audit writes.                              | Needs unified immutable audit model later.    |
| `app_settings`    | Rent config and owner read routes.                 | Rent config needs effective dates in P1-003.  |
| `sessions`        | Handover/history and delete-session void.          | Money fields use `REAL`; P0-001 remains.      |
| `transactions`    | Direct fix for clean employee entry missing table. | Money fields use `REAL`; P0-001 remains.      |
| `arrears`         | Legacy owner arrears and void compatibility.       | Formal receivables remain P0-008.             |
| `arrear_tasks`    | Short-pay follow-up tasks.                         | Formal receivables linkage remains P0-008.    |
| `entry_events`    | Employee entry and void audit anchors.             | Needs unified audit model later.              |
| `deposit_ledger`  | Deposit balance and void compatibility.            | Money fields use `REAL`; P0-001 remains.      |

## Why This Is Minimal

The migration mirrors only fields already used by the current Worker route paths. It does not add a new accounting model, does not change formulas, and does not create production SaaS tenancy.

## Verification

```text
npm run db:local:bootstrap
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local dev seed app_settings for local-dev-company
PASS local D1 bootstrap

npm run verify:clean-d1
PASS smoke
PASS smoke:auth
PASS smoke:core
PASS smoke:employee-entry
PASS transactions_count 1
PASS clean D1 bootstrap verification

npm run probe:clean-bootstrap
PASS clean local Worker bootstrap supports employee entry.
```

## Production Impact

- Production migration: not executed.
- Production Worker deploy: not executed.
- Production config: not modified.
- Schema file is local-only under `migrations/local/`.

## Deferred Work

- P0-001: migrate money from `REAL` to integer minor units.
- P0-006: add tenant/company/property isolation.
- P0-008: add formal receivables lifecycle.
- P1-002: remove runtime `CREATE TABLE` / `ALTER TABLE` after migration confidence.
