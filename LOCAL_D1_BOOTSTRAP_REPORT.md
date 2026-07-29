# Local D1 Bootstrap Report

Date: 2026-05-23  
Task: P0-007A local bootstrap verification only

## Scope

This report checks whether local D1 can support the current smoke/auth flow and whether a clean local D1 can support employee entry. It does not perform production migration and does not redesign the commercial accounting schema.

## Findings

| Check                                | Result       | Evidence                                                | Meaning                                                          |
| ------------------------------------ | ------------ | ------------------------------------------------------- | ---------------------------------------------------------------- |
| Migrations directory exists          | yes          | `migrations/001_employee_anchor_schema.sql`             | Existing migration assumes `transactions` already exists         |
| Commercial schema draft exists       | yes          | `migration-drafts/002_commercial_bootstrap.sql`         | Draft contains commercial tables but is not live migration       |
| Runtime DDL exists                   | yes          | `DATABASE_STATIC_SCAN.md`                               | Worker still creates/alters tables at runtime                    |
| Local auth D1 bootstrap              | pass         | `npm run smoke:with-worker` passed owner/employee login | `active_sessions` and `employee_users` are enough for auth smoke |
| Local employee entry clean bootstrap | fail         | `npm run probe:clean-bootstrap`                         | Missing `transactions` table                                     |
| Production D1 mutation               | not executed | all commands local/dry-run only                         | Safe                                                             |

## Clean Bootstrap Failure Evidence

```text
npm run probe:clean-bootstrap
Employee entry smoke exit code: 1
FAIL employee entry expected 200, got 500
Caused by: Error: no such table: transactions: SQLITE_ERROR
P0 confirmed: clean local Worker bootstrap cannot complete employee entry.
```

## Interpretation

The local Worker/Auth smoke can now run repeatably, but a clean local D1 still cannot run the employee entry smoke because the live Worker path expects `transactions` to exist. This is not fixed in P0-007A because it belongs to P0-005 clean database bootstrap and P0-008 accounting model work.

## Status

- Local Worker startup: Verified.
- Owner login: Verified.
- Employee login: Verified.
- Unauthenticated sensitive API denial: Verified.
- Invalid JWT denial: Verified.
- Employee denied owner API: Verified.
- Clean employee entry bootstrap: Blocked by missing `transactions`.

## Safe Next Step

Do not add ad hoc runtime table creation just to make the test pass. The safe next step is a non-production commercial bootstrap migration rehearsal that creates all required business tables in order, then reruns `npm run probe:clean-bootstrap`.
