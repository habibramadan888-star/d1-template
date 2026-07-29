# P0-008F Starting Context

Date: 2026-05-26, Asia/Dubai

Scope: staging/local-only receivables authority switch gate. This task does not deploy, migrate, write D1 rows, call production, mutate dashboard output, or enable remote feature flags.

## Inputs Reviewed

- `NEXT_PROMPT_P0_008F_RECEIVABLES_STAGING_AUTHORITY_SWITCH_GATE.md`
- `P0_008E_DASHBOARD_RECEIVABLES_AUTHORITY_EVIDENCE.md`
- `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`
- `RECEIVABLES_STAGING_TEST_DATA_RETENTION_PLAN.md`
- `RECEIVABLES_STAGING_SHADOW_DATA_SEED_RESULT.md`
- `scripts/compare-staging-receivables-shadow.mjs`
- `modules/finance/receivables.mjs`
- `tests/receivables-staging-shadow-rehearsal.spec.mjs`

## What P0-008E Proved

- Receivables shadow can compute due today, overdue amount, arrears total, arrears outstanding, rent due, and rent received from current staging evidence.
- Staging-only QA data covers due today, overdue, short pay, partial repayment, full repayment, void impact, and deposit exclusion.
- Adjustment credit and adjustment debit are explicit expected differences and require accounting review before any authority switch.
- Live dashboard output remained unchanged.
- Production remained `NO-GO`.

## P0-008F Minimum Safe Scope

- Add a local/staging-only feature flag gate named `ENABLE_RECEIVABLES_AUTHORITY_STAGING`.
- Treat production and missing `APP_ENV` as disabled.
- Evaluate authority candidates from read-only staging comparison evidence.
- Keep adjustment and legacy warning rows shadow-only and accounting-review-required.
- Do not mutate dashboard responses.
- Do not write staging or production D1.
- Keep P0-008 as Partial.
