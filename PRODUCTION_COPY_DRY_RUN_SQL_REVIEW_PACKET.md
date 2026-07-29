# Production Copy Dry-Run SQL Review Packet

Date: 2026-05-27, Asia/Dubai

Status: `SQL_REVIEW_REQUIRED`

Scope: review requirements for SQL that may be run against
`homelink-finance-production-copy-dryrun` in a future task. No SQL was executed
in COMMERCIAL-LAUNCH-REVIEW-004.

## SQL Review Matrix

| SQL / Area                        | Allowed On Copy?             | Required Before Execution                              | Forbidden Patterns                                     | Owner Approval                   |
| --------------------------------- | ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | -------------------------------- |
| Schema-only compatibility columns | yes, after review            | exact table/column list and rollback method            | `DROP`, `DELETE`, `UPDATE`, `NOT NULL` without default | Engineering + tenant scope owner |
| Money minor-unit columns/backfill | yes, after accounting review | exact conversion rules, row counts, mismatch report    | float authority, silent rounding, frontend totals      | Accounting + engineering         |
| Receivables tables/backfill       | yes, after accounting review | lifecycle mapping, allocation rules, adjustment policy | production authority switch, dashboard live switch     | Accounting + engineering         |
| Handover atomic tables/backfill   | yes, after review            | idempotency semantics, audit/entry mapping             | live route switch, production feature flag             | Engineering + accounting         |
| Tenant/property row backfill      | yes, after mapping approval  | source rule, `WHERE`, expected rows, rollback          | unfiltered update, legacy `CORPID` as final authority  | Business owner + engineering     |
| Audit/event scope evidence        | yes, after review            | visibility policy, retention rules                     | deleting audit rows, exposing cross-tenant data        | Business owner + engineering     |

## Required SQL Checklist

Every future SQL file must include:

1. Target D1 name in the approval packet: `homelink-finance-production-copy-dryrun`.
2. A statement-level purpose summary.
3. Expected rows affected per statement.
4. Rollback plan per statement or phase.
5. Confirmation that no statement targets production D1.
6. Confirmation that no secret, password, token, or cookie appears in SQL.
7. Confirmation that money writes use integer fils where applicable.
8. Confirmation that every row-level update has a `WHERE` clause.

## Stop Conditions

Stop before execution if:

- SQL target is not the exact production-copy D1.
- Any `UPDATE` lacks a `WHERE` clause.
- Any statement deletes or drops production-copy data without explicit rollback
  and approval.
- Accounting review is missing for money/receivables changes.
- Tenant mapping review is missing for tenant/property changes.
- Rollback proof is missing.

Conclusion: SQL remains manual-review-only. This packet is not approval to run
copy SQL.
