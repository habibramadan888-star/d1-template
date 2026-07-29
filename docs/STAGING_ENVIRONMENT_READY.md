# Staging Environment Ready Report

Generated: 2026-05-30

Status: LOCAL DATABASE READY; LIVE ENDPOINT SMOKE PENDING

## Environment Summary

```text
Database:      Local D1-compatible SQLite database at .wrangler/state/d1.db
Migrations:    Applied locally with compatibility warnings
Test data:     Generated, 1,205 records
Feature flags: Disabled by default in staging config
Worker:        Ready for local/live smoke once started
```

## Test Data Inventory

| Entity      |     Count | Status |
| ----------- | --------: | ------ |
| Tenants     |         2 | Ready  |
| Properties  |         3 | Ready  |
| Customers   |       100 | Ready  |
| Entries     |       500 | Ready  |
| Payments    |       300 | Ready  |
| Receivables |       200 | Ready  |
| Audit Logs  |       100 | Ready  |
| **TOTAL**   | **1,205** | Ready  |

## Required Database Tables

```text
entries
payments
customers
receivables
receivables_ledger
audit_logs
idempotency_keys
tenants
properties
handovers
```

All 10 required local staging tables are verified by `scripts/init-staging-database.js`.

Migration notes:

```text
Migrations processed: 4
Warnings ignored: 10
Reason: legacy/local migrations contain duplicate columns and one legacy index
        that does not apply to the P0 audit_logs schema.
Impact: required local staging tables and test data were created successfully.
```

## Endpoint Verification Status

`scripts/verify-staging-endpoints.js` performs a deterministic source inventory scan and can run live HTTP checks when `LOCAL_STAGING_BASE_URL` or `STAGING_BASE_URL` is set.

Current scope:

```text
Endpoint expectations evaluated: 25
Source wired or aliased: 6
Candidate module present: 1
Not wired in source scan: 18
Live HTTP verification: pending until Worker is running
Known aliases: /api/auth/login -> /auth/login, /api/auth/logout -> /auth/logout
Candidate route: /api/dashboard/totals handler exists but still requires route wiring
```

## Feature Flags

```text
FF_BACKEND_TOTALS:    false
FF_RECEIVABLES_STATE: false
FF_TENANT_ISOLATION:  false
FF_AUDIT_TRAIL:       false
```

## Next Steps

1. Start local Worker against the local D1 state.
2. Run live endpoint verification with `LOCAL_STAGING_BASE_URL=http://127.0.0.1:<port>`.
3. Execute Phase 0 readonly smoke test.
4. Keep `PRODUCTION_NO_GO` until endpoint wiring, smoke results, and sign-offs are complete.

## Phase 0 Readiness Decision

Local data setup is ready.

Full Phase 0 execution is pending live Worker endpoint verification.
