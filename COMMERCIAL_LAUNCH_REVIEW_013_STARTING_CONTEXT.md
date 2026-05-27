# Commercial Launch Review 013 Starting Context

Date: 2026-05-27, Asia/Dubai

Scope: TOP_25 money risks review support only. No production deploy, staging
deploy, production migration, staging migration, production D1 write, staging D1
write, production-copy D1 write, D1 export/import/execute, production URL call,
feature flag change, dashboard change, business-code change, or financial
formula change was performed.

Production cutover status: `PRODUCTION_NO_GO`

## Current TOP_25 Money Risks

`TOP_25_MONEY_RISKS.md` contains 25 ranked items from the static money triage:

- 17 legacy `REAL`/decimal schema authority risks in sessions, transactions,
  arrear tasks, and deposit ledger paths.
- 5 live backend conversion or amount parsing risks that still need accounting
  review.
- 3 non-money/static-scan false-positive closure candidates:
  `lockAlias` sorting, Dubai date formatting, and pagination page count.

## Evidence That Reduces Risk

- `MONEY_PRECISION_POLICY.md` defines integer AED fils as the target authority
  and rejects silent rounding.
- `MONEY_DUAL_WRITE_MIGRATION_REVIEW.md` reviewed nullable `*_fils` companion
  columns without executing production migration.
- `MONEY_RECONCILIATION_GATE_RESULT.md` keeps the money gate at
  `MANUAL_REQUIRED`, which prevents automatic production approval.
- `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md` shows staging backend totals
  matched checked legacy totals, while arrears and dashboard authority remain
  blocked/manual-required.
- `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md` shows receivables shadow
  comparison passed with 0 mismatches, but two adjustment cases remain
  `EXPECTED_DIFFERENCE` and still need accounting approval before production.

## Risks That Still Need Human Accounting Judgment

- Whether each legacy `REAL` money column can be converted/backfilled to fils
  using the proposed production plan.
- Whether sessions totals, backend totals, and handover totals can become live
  authority after production reconciliation.
- Whether deposit ledger semantics for amount, delta, balance, deduction, and
  refund are accepted.
- Whether receivables lifecycle, allocations, repayments, adjustments, and
  arrears semantics are approved.
- Whether legacy number/decimal conversion warnings are acceptable for a
  production migration path.

## Production Blockers

- TOP_25 money risks are not approved by Ramadan Habib.
- Money reconciliation signoff remains pending review.
- Production migration/backfill SQL is not approved.
- Fresh production backup and rollback approval are not complete.
- P0-001, P0-003, P0-006, and P0-008 remain Partial.
- Commercial launch gate remains `PRODUCTION_NO_GO`.

## Approve Candidates

The following are approve candidates only for closure as non-money scan hits.
They are not production approval:

- Rank 1: `locks.sort(... localeCompare ...)` is ordering logic, not money
  authority.
- Rank 19: Dubai `Intl.DateTimeFormat` business-date helper is date logic, not
  money authority.
- Rank 22: `Number(data.pages || 1)` is pagination count logic, not money
  authority.

Each still requires Ramadan Habib decision before the TOP_25 signoff can close.

## Why Production Remains NO-GO

Staging and production-copy evidence reduces technical uncertainty, but it does
not replace human approval for accounting semantics, production SQL, migration
row counts, backup/rollback, deploy, feature flags, or cutover timing.
