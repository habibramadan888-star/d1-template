# NEXT PROMPT: P0-001H Local/Staging Employee Entry Adapter Route Harness

Use this only after human review of P0-001G.

## Task

Enter TASK P0-001H: create a local/staging-only route harness for the employee
entry live write adapter.

## Current State

- P0-001G has passed a non-invasive adapter rehearsal.
- `modules/worker/employee-entry-live-write-adapter.mjs` creates `*_fils`
  write plans but is not wired into `/api/employee/entry`.
- `npm run test:employee-entry-live-write-adapter` passes.
- `npm run rehearse:employee-entry-live-write-adapter` passes with 0 DB
  mutations.

## Goal

Create a local/staging-only harness endpoint that can exercise the adapter
through Worker auth and environment guards without changing live production
behavior.

Suggested endpoint:

`POST /api/staging/employee-entry/adapter-draft`

## Strict Limits

1. Do not switch live `/api/employee/entry`.
2. Do not modify live dashboard results.
3. Do not modify live handover flow.
4. Do not execute production D1 migration.
5. Do not execute remote D1 migration.
6. Do not deploy staging or production.
7. Do not delete legacy decimal or `REAL` fields.
8. Do not write legacy live `transactions`, `deposit_ledger`, `arrears`, or
   `sessions` as accounting authority.
9. Do not mark P0-001 Verified.

## Required Guards

- `APP_ENV` must be `development`, `local`, `test`, or `staging`.
- Production must return `404`.
- Feature flag must be required, for example
  `ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING=true`.
- Feature flag off must return `403 FEATURE_DISABLED`.
- Employee/staff role required.
- Owner/admin submit must be rejected.

## Required Tests

Add tests for:

1. production disabled
2. feature flag disabled
3. unauthenticated denied
4. invalid JWT denied
5. employee valid rent draft
6. employee valid deposit draft
7. employee valid refund draft
8. employee valid arrears payment draft
9. owner/admin rejected
10. invalid three-decimal money rejected
11. voided row skipped
12. no legacy live table writes
13. no dashboard result change

## Required Verification

Run:

```text
npm run check
npm run smoke:with-worker
npm run verify:clean-d1
npm run test:employee-entry-live-write-adapter
npm run rehearse:employee-entry-live-write-adapter
npm run security:secrets
```

If new scripts are added, run them too.

## Status Rule

P0-001 may only become:

`Partial - local/staging employee entry adapter route harness passed`

Do not mark Verified, Done, or Fixed.
